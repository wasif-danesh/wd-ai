# web

The Next.js app (App Router, React 19, strict TypeScript) that users see, and the backend-for-frontend (BFF)
in front of the API. One app serves every product (ADR-0014); today that is `wd-music-ai` plus a `/hello` demo.

| Page | What it is |
|---|---|
| `/` | Create a song: idea form, live progress, lyric review, result |
| `/songs` | My songs: a grid of finished songs, newest first, "Load more" |
| `/songs/[id]` | One song: cover, player, downloads, lyrics (links are signed fresh on every visit) |
| `/hello` | The platform's sample graph, a streaming smoke test |

## How it fits together

```
Browser ── fetch ──► app/api/* (BFF route handlers) ──► FastAPI ──► LangGraph, Redis, Postgres, storage
   ▲                                                         
   └── pages (server components) call the API directly for reads ─┘
```

- **The browser never calls FastAPI.** `app/api/**/route.ts` forward to it through `lib/proxy.ts`,
  which validates path segments (UUIDs and product ids, not just URL-encoding them), forwards only
  `Last-Event-ID` when it is a plain number, and passes event streams through unbuffered.
- **Pages that read data are server components** (`/songs`, `/songs/[id]`): the first paint has the
  data, and an unknown song is a real 404.
- **Interaction is client components** under `components/create/`, driven by one hook.

## The song flow

`lib/song-flow.ts` is a **pure reducer**: server events in, UI state out. It has no fetch and no React,
so every behaviour is tested against recorded event sequences. `hooks/use-song-flow.ts` does the I/O
around it:

- starts a run and answers the approval (`/api/products/wd-music-ai/runs`, `/api/runs/{id}/resume`);
- **reconnects** if the stream drops mid-run, asking only for what it missed (`Last-Event-ID`);
- **re-attaches after a reload** while a run is in progress or waiting for approval (the run id is
  kept in `sessionStorage`; the server replays the events). A *finished* run is not restored: the song
  lives in My songs, and Create opens on an empty form;
- shows an unreachable server or an API error in plain words, with Try again where retrying can help.

The event contract the UI builds against is in `products/wd-music-ai/README.md`.

## Styling

Hand-written modern CSS in `app/globals.css`; no framework and no runtime dependency.

- **Design tokens** as OKLCH custom properties, with `light-dark()`, so dark mode follows the system
  with no second stylesheet. `color-mix()` derives borders, tints and glows from the tokens.
- **Cascade layers** (`reset, tokens, base, layout, components, utilities`) keep specificity predictable.
- **Native nesting**, **container queries** (the stepper and the song layout adapt to the width of their
  container, not the viewport), `@starting-style` entrance animations, `field-sizing: content` for
  textareas, `@property` and fluid `clamp()` type.
- **Motion respects `prefers-reduced-motion`.**

## Accessibility

Skip link; one `h1` per page; every control labelled; the stepper is an ordered list with `aria-current="step"`;
progress is a native `<progress>` (the visible bar is decorative); status changes and form hints are announced
through `aria-live`; focus moves to the review panel when it appears; errors use `role="alert"`; all colours
are tokens that meet contrast in both schemes.

## Commands

```bash
pnpm --filter web dev      # API_BASE_URL=http://localhost:8000 pnpm --filter web dev, with the stack up
pnpm --filter web test     # 84 tests: reducer, hook, components, BFF routes
pnpm --filter web build    # production build (also type-checks and lints)
```

Tests use Vitest; component tests opt in to jsdom with `// @vitest-environment jsdom`.

## Sign-in

Auth.js (ADR-0030). `AUTH_MODE=stub` (the `.env.example` default) skips sign-in: everything runs as
the dev user. `AUTH_MODE=jwt` needs `AUTH_SECRET`, `API_AUTH_SECRET` (the same value in the API) and at
least one provider and `AUTH_URL` (the public origin; without it a container builds the callback address
from `0.0.0.0` and the provider rejects it). Register one OAuth app per environment with this redirect URI:

| Provider | Id in the URI | Variables |
|---|---|---|
| Google | `google` | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| GitHub | `github` | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` |
| Microsoft | `microsoft-entra-id` | `AUTH_MICROSOFT_ENTRA_ID_ID`, `_SECRET`, `_ISSUER` (`https://login.microsoftonline.com/<tenant id>/v2.0`) |

Redirect URI: `<web origin>/api/auth/callback/<id>`, e.g. `http://localhost:3000/api/auth/callback/google`.
Only configured providers appear on `/signin`. Set `ADMIN_EMAILS` (API) to make a verified address an
admin. Pages redirect to `/signin` without a session; `/api` routes answer 401.

## Not done yet

- Only GitHub sign-in has been tried with a real login; Google and Microsoft are wired the same way.
- Sharing links for songs and a public gallery are out of scope for the MVP.
- Downloads: browsers ignore the `download` attribute for other-origin links, so files open in a tab
  instead of saving directly. A same-origin download route would fix it.
