# web

The Next.js app (App Router, React 19, strict TypeScript) that users see, and the backend-for-frontend (BFF)
in front of the API. One app serves every product (ADR-0014); today `wd-music-ai` (`/music`) and `wd-video-ai` (`/video`: create, `/video/creations/{id}`; a clip is made in the background, the header shows "Making your video…" and a notice says when it is ready) and `wd-image-ai` (`/image`: create, `/image/creations` My images, `/image/creations/{id}`; image to image uploads the picture first through `/api/products/wd-image-ai/uploads/images`).

| Page | What it is |
|---|---|
| `/` | The studio home, "WD AI Studio": a card per product (public) |
| `/music` | Create a song: idea form, live progress, lyric review, result (sign-in required) |
| `/creations` | My creations: one library of everything the user made (songs, images, videos, including clips still being made), newest first, with filters and "Load more" (sign-in required) |
| `/music/songs/[id]` | One song: cover, player, downloads, lyrics (links are signed fresh on every visit) |
| `/image`, `/video` | Create an image or a video (sign-in required); one item is at `/image/creations/[id]` and `/video/creations/[id]` |
| `/admin/...` | The admin area (admins only) |

## How it fits together

```
Browser ── fetch ──► app/api/* (BFF route handlers) ──► FastAPI ──► LangGraph, Redis, Postgres, storage
   ▲                                                         
   └── pages (server components) call the API directly for reads ─┘
```

- **The browser never calls FastAPI.** `app/api/**/route.ts` forward to it through `lib/proxy.ts`,
  which validates path segments (UUIDs and product ids, not just URL-encoding them), forwards only
  `Last-Event-ID` when it is a plain number, and passes event streams through unbuffered.
- **Pages that read data are server components** (`/music/songs`, `/music/songs/[id]`): the first paint has the
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
  lives in My creations, and the create page opens on an empty form;
- shows an unreachable server or an API error in plain words, with Try again where retrying can help.

The event contract the UI builds against is in `products/wd-music-ai/README.md`.

## Styling

Hand-written modern CSS in `app/globals.css`; no framework and no runtime dependency.

- **Design tokens** as OKLCH custom properties, with `light-dark()`, so dark mode follows the system
  with no second stylesheet. The header theme control can override the system choice and remembers
  that preference in the browser. `color-mix()` derives borders, tints and glows from the tokens.
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
admin (Google's verified email, or the primary verified address on your GitHub account). Pages redirect to `/signin` without a session; `/api` routes answer 401.

## Downloads

The Download buttons point at `/api/products/wd-music-ai/songs/{id}/download/{audio|cover|video}`, not at the
storage link. Browsers ignore the `download` attribute on a link to another origin (the storage host), so
the file would open in a tab. The route is served from the app's own origin with `Content-Disposition:
attachment` and a readable name (`neon-rain.mp3`); the API looks the song up for the signed-in user only
([ADR-0034](../../docs/decisions/0034-song-downloads.md)).

- **Audio** is the MP3 with the title, lyrics and cover art written into its tag, so a music player shows the cover.
- **Cover** is the stored PNG as it is.
- **Video** is the cover as a picture with the song playing (MP4), made on the first click and kept in storage.

Playing and showing on the page still use the signed storage links.

## Admin

`/admin` (Overview with usage, Users, Songs, Audit log) is for users whose role is `admin`; everyone else
sees "Admins only", and the API answers `403` to the same calls. To become admin, list your verified email in
`ADMIN_EMAILS` for the API (Google's verified address, or the primary verified address of your GitHub account) and
sign in again. With `AUTH_MODE=stub` the dev user is an admin. The Admin link in the header appears only for admins.

### Models

`/admin/models` lists the model aliases the products use and what serves each. Pick a provider, a model and (for hosted
providers) an API key, then **Test connection** (nothing is saved) or **Save**. The key box is write-only and always starts
empty. Saving a new model for the guardrail's `moderator` first runs the guardrail test cases on it and refuses the change if it
lets a must-refuse request through; this takes about half a minute. **Reset to default** undoes a change.

### Media

`/admin/media` lists each product's media capabilities (for example `wd-music-ai` `image.generate` and `music.generate`) and
what runs them. By default that is the product's own ComfyUI workflow on the local ComfyUI. Choose **Comfy Cloud / Comfy API (v2)**
or, for images, an **OpenAI-compatible image API**, enter its address and key, then **Test connection** (it checks the service
answers; it does not generate anything) or **Save**. The next job uses it. A saved key is kept when you save again for the same
backend, and is never shown. Needs `MEDIA_SECRETS_KEY` (`make setup` creates it) before a key can be saved.

## Not done yet

- Only GitHub sign-in has been tried with a real login; Google and Microsoft are wired the same way.
- Sharing links for songs and a public gallery are out of scope for the MVP.
