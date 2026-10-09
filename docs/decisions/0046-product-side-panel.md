# ADR-0046: Product side panel (navigation inside a product)

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

Today every product page sits under a plain top bar, and the home page is the only place that lists all
products. With six products (music, image, video, text to speech, speech to text, lip sync) and more to come,
moving between them and between a product's own views (create, history, library) takes too many steps. The
owner showed a reference interface: a left side panel with grouped navigation, a collapsible icon rail,
pinned tools, a breadcrumb and search at the top, and a prompt area at the bottom of the creation screen.

Decided by the owner: **the home page stays as it is, and the side panel appears only when the user is inside a
product.** The panel's component is ready-made in shadcn/ui (ADR-0045, proposed): `Sidebar`, `Breadcrumb`,
`Command` (the ⌘K palette), `Sheet` for the mobile drawer. This ADR therefore depends on ADR-0045 and is
implemented after it.

## Decision

- **Where the panel shows.** Under every product area (`/music`, `/image`, `/video`, `/text-to-speech`,
  `/speech-to-text`, `/lip-sync` and their `creations` pages) and in My creations. The home page, sign-in,
  and the Coming-soon pages have no panel; the home page keeps its product cards. The panel is a shared layout
  (`app/(product)/layout.tsx`) that the product routes move under; URLs do not change.
- **Contents.** A header with the studio name (a link home). A "Create" group with the products that are live
  (from `lib/products.ts`, so a product is added in one place), each with an icon, and a "Library" group with
  My creations. The current product is highlighted (`aria-current`). Products that are "Coming soon" are shown
  disabled with the tag, so the list matches the home page. Admins also see an "Admin" group. A footer holds the
  user's name and image with a menu (sign out, account), and a theme choice.
- **Inside a product,** the panel shows that product's own views as a second section (for example Music: Create,
  Songs; Text to Speech: Create, History), declared in `lib/products.ts` next to the product entry.
- **Behaviour.** Collapsible to an icon rail; the state is remembered per browser (a cookie, so the server
  renders the right width and avoids a flash). On a phone it is a drawer opened from a button in the top bar.
  Fully keyboard operable; a "skip to content" link comes first; labels are real text (not icon-only except in
  the rail, where each has a tooltip and an accessible name).
- **Top bar.** A breadcrumb (Product, then the current view or item), a search field that opens the command
  palette (⌘K or Ctrl K) and searches My creations with the existing semantic search (ADR-0041) from anywhere,
  plus the existing header actions (the "ready" badge for finished background work from ADR-0037). The palette
  also jumps to products and views.
- **Pinned items are not in the first version.** Reordering and pinning (drag and drop) are a later option, to be
  added only if people ask.
- **Multilingual.** The layout uses logical properties and a `dir` attribute so it mirrors for right-to-left
  languages; the panel must hold long labels and non-Latin scripts without clipping; interface text is kept in one
  place (a message file per language when translation of the interface is decided separately).
- **Content width.** The main area keeps the current reading width on text-heavy pages (forms, a single result)
  and uses the full width for libraries and tables.
- **A shared prompt bar is a separate decision.** The reference's bottom prompt bar for creation screens is not part
  of this ADR; if the creation products should share one, it gets its own ADR after the panel exists.

## Consequences

- Moving the product routes under one layout changes the file layout of `apps/web/app` (route groups) but not
  URLs; the auth rules in `lib/auth-mode.ts` and their tests stay valid.
- The home page and its tests stay; the header changes inside products, so component and page tests that render
  the old header are updated.
- Adding a product means one entry in `lib/products.ts` (title, icon, href, status, and its views); the home card
  and the panel both read it.
- Server components fetch nothing new for the panel (the list is static), so it adds no latency; the
  collapsed state cookie is the only new state.
- Depends on ADR-0045 for the components and tokens, and on a decision about interface translation for labels in
  other languages (not decided here).
- Risk: the panel takes width on small laptops and phones; the rail and the drawer are the answer, and 320 px
  wide must be tested.

## Not in this version

Pinning and reordering, a notifications centre, team or workspace switching, per-user custom navigation, a
shared prompt bar, and changing the home page.

## Docs to update if accepted

`CLAUDE.md` (a Convention: "a new product is one entry in `lib/products.ts`, which feeds the home card and the
side panel"), `docs/architecture.md` (web section), `docs/decisions/README.md` (status), and the per-product
READMEs if their routes move.
