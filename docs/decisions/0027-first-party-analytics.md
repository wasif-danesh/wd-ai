# ADR-0027: First-party analytics

- **Status:** Proposed (planning record; not scheduled)
- **Date:** 2026-10-08

## Context

We want our own numbers (page hits, logins, signups, songs made, errors, conversion to paid) that do
not depend on a third party and that join to usage events and billing. The wish list includes IP
address and email. Both are personal data, so what we store, for how long and why must be decided
up front, not added later.

## Decision (proposed)

- **Separate from `usage_events`.** Usage events are billing records and stay exact. Analytics
  events go to their own table `analytics_events` (tenant_id, product_id, user_id nullable,
  session_id, event, path, referrer, user agent class, country, created_at, properties JSON).
- **Events:** `page_view`, `login`, `logout`, `signup`, `song.started`, `song.completed`, `error`,
  `checkout.started`, `checkout.completed`. Auth events are written by the API (trusted); page views
  by a small BFF endpoint. No cookies are needed for first-party counts: a daily-rotating
  session hash is enough.
- **IP address:** not stored raw by default. Store a truncated IP (IPv4 /24, IPv6 /48) or a salted
  daily hash for unique counts, and a coarse country derived at ingest. Raw IPs are kept only in
  security and abuse logs, with a short retention (suggested 30 days).
- **Email:** never in analytics events. Join to the user table by `user_id` when a report needs it,
  and only in admin reports behind the admin role.
- **Retention:** raw events 13 months, then aggregated daily tables. Deleting a user deletes or
  anonymises their events.
- **Bots and abuse:** filter known bots on read; failed-login and rate-limit events feed the abuse
  controls that billing and free quotas need.
- **Admin dashboard:** counts and trends in the admin section (ADR-0025), read from aggregates.
- **Do not track / consent:** first-party, cookieless counting without raw IPs is intended to need
  no consent banner; confirm this with legal advice for each region before launch.

## Consequences

- Needs authentication and the admin role first.
- A privacy policy and a data-deletion path are required before storing any user-linked event.
