# ADR-0011: Tenancy, identity and usage seams from day one

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Auth, billing and observability come later, but retrofitting tenancy and metering is expensive.

## Decision

Every table, job, cache key and object key carries `tenant_id` and `product_id`. Every request resolves an identity (stub user in dev). Every billable action writes a `usage_events` row. Code is instrumented with OpenTelemetry and logs structured JSON with trace IDs.

## Consequences

- Billing, quotas and per-tenant isolation become readers of existing data.
- Slight overhead now, even with one user.
