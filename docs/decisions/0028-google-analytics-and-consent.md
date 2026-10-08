# ADR-0028: Google Analytics and consent

- **Status:** Proposed (planning record; not scheduled)
- **Date:** 2026-10-08

## Context

Marketing will want Google Analytics 4 (acquisition, campaigns). It is a proprietary third-party
service that sets cookies and sends visitor data to Google, so it needs consent in the EEA, UK and
other regions, and rule 12 requires asking first.

## Decision (proposed)

- **GA4 is optional and off by default.** Enabled per environment with an env var
  (`NEXT_PUBLIC_GA_MEASUREMENT_ID`); absent means no script is loaded. Never enabled in dev.
- **Consent first.** A consent banner (accept, reject, manage; reject as easy as accept) gates the
  script, using Google Consent Mode v2 with all storage denied until the visitor agrees. The choice
  is remembered and can be changed from the footer.
- **Only public pages.** No GA on the create flow, "My songs", admin or auth pages, and never any
  idea, lyrics, email or user ID in events or URLs (privacy rules).
- **Few events.** `page_view` plus `sign_up`, `login`, `begin_checkout` and `purchase` for the funnel;
  these mirror, but never replace, first-party events (ADR-0027), which stay the source of truth.
- **Loaded with `next/script`** after interaction to protect performance (ADR-0026).
- **Alternative to compare before building:** a self-hosted, cookieless tool (for example Plausible
  or Umami) that avoids the banner and third-party data sharing. The choice is open.

## Consequences

- A cookie and privacy policy page is needed first; legal review per launch region.
- First-party analytics must work with GA off, so nothing in the product depends on Google.
