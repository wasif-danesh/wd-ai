# ADR-0007: Single Postgres for data, checkpoints and vectors

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

The design needs app data, LangGraph checkpoints, job records, usage events and RAG vectors. Separate stores (e.g. Chroma) add operational load.

## Decision

Use one Postgres with the pgvector extension for all of these. Use only standard features available on RDS, Cloud SQL and Azure Flexible Server.

## Consequences

- One database to back up, migrate and secure.
- Vector search scale is bounded by Postgres; revisit if a product needs very large vector sets.
