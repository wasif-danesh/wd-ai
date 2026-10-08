# ADR-0040: One library: "My creations"

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

Each product grew its own list: "My songs" (`/music/songs`), "My images" (`/image/creations`), and now the video
product. The studio also has a unified "My creations" page (`/creations`). Three product lists and a combined one
confused people: the same things were reachable under different names, and result pages said "saved in My images"
or "Open in My songs" while the header said "My creations". Each new product would add another list.

## Decision

- **One library for everything a user made: "My creations", at `/creations`.** It lists songs, images and
  videos together, newest first, with a filter (All, Songs, Images, Videos). Clips still being made and clips
  that failed appear there too (ADR-0037).
- **Every label and link says it the same way.** Result messages ("It's saved in My creations"), the buttons
  ("Open in My creations"), the back links on a single item ("← My creations"), the header ("My creations"),
  the page title, and where a deleted item returns to all point at `/creations`.
- **The old per-product list pages are removed, not redirected.** `/music/songs` and `/image/creations` no
  longer exist (they are ordinary not-found pages), and so do their list components. No unused page is kept
  around to confuse people; the product is not public yet, so there are no links to protect.
- **A single item keeps its product address** (`/music/songs/{id}`, `/image/creations/{id}`,
  `/video/creations/{id}`): they are the shareable pages ADR-0026 will build on, and changing them would
  break links already shared. The product APIs are unchanged.
- **A new product adds a kind to the library**, not a list of its own: its list route, a card and a filter
  value.

## Consequences

- One place to look, and one name to learn. Adding a product means a card and a filter in `CreationsList`, plus a
  fetch in the `/creations` page.
- The library loads a page of each kind and merges them by time, so "Load more" can bring older items of a
  kind that has more; that is the existing behaviour of the combined page.
- ADR-0033's product-scoped list addresses are superseded for lists; its product areas and item addresses stand.
