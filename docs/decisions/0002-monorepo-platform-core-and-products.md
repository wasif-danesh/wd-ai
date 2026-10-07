# ADR-0002: Monorepo with platform core and thin products

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

The goal is to launch products quickly. Each product needs the same API, runtime, gateway, workers and storage.

## Decision

One monorepo. Shared platform code lives in `services/` and `packages/`; each product lives in `products/<id>/` as graphs, prompts, workflows and `product.yaml`, plus its UI in `apps/web`. Python uses a uv workspace; TypeScript uses pnpm + Turborepo. Each product deploys as its own Helm release on shared charts.

## Consequences

- Adding a product adds no new services or endpoints.
- Platform changes are tested against all products in one CI run.
- The repo needs clear ownership boundaries between core and products.
