# Architecture decision records

| ADR | Title | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-monorepo-platform-core-and-products.md) | Monorepo with platform core and thin products | Accepted |
| [0003](0003-fastapi-with-langgraph-library.md) | FastAPI hosting LangGraph as a library | Accepted |
| [0004](0004-nextjs-bff-and-sse.md) | Next.js frontend as BFF, SSE for streaming | Accepted |
| [0005](0005-litellm-gateway-for-all-inference.md) | LiteLLM gateway for all LLM inference | Accepted |
| [0006](0006-queue-based-media-jobs.md) | Queue-based media generation | Accepted |
| [0007](0007-single-postgres-with-pgvector.md) | Single Postgres for data, checkpoints and vectors | Accepted |
| [0008](0008-podman-engine-neutral-repo.md) | Podman for local development, engine-neutral repo | Accepted |
| [0009](0009-kubernetes-everywhere-three-layers.md) | Kubernetes everywhere, cloud-portable in three layers | Accepted |
| [0010](0010-capability-based-model-configuration.md) | Capability-based, swappable model configuration | Accepted |
| [0011](0011-tenancy-identity-usage-seams.md) | Tenancy, identity and usage seams from day one | Accepted |
| [0012](0012-music-model-ace-step.md) | Music model: ACE-Step 1.5, not YuE2 | Accepted |
| [0013](0013-auth-mvp-authjs.md) | MVP authentication with Auth.js | Accepted |
| [0014](0014-shared-nextjs-app.md) | One shared Next.js app with route groups | Accepted |
| [0015](0015-phase-0-tooling-choices.md) | Phase 0 tooling choices | Accepted |
| [0016](0016-helm-chart-structure.md) | One umbrella Helm chart, plain Ingress, in-cluster state for non-prod | Accepted |
| [0017](0017-platform-core-design.md) | Platform core: capability layer, usage events, storage and RAG | Accepted |
| [0018](0018-default-text-model-gemma4-e4b.md) | Default text model: Gemma 4 E4B | Accepted |
| [0019](0019-cover-image-model-flux2-klein-4b.md) | Cover image model: FLUX.2 [klein] 4B | Accepted |
| [0020](0020-multimodal-input.md) | Multimodal input in the capability layer | Accepted |
| [0021](0021-media-pipeline-redis-streams.md) | Media pipeline on Redis Streams | Accepted |
| [0022](0022-song-graph-and-guardrail.md) | The song graph and its guardrail | Accepted |
| [0023](0023-product-provided-routes.md) | Product-provided API routes | Accepted |
| [0024](0024-real-model-validation.md) | Real-model validation of the music and cover workflows | Accepted |
| [0025](0025-model-access-configuration.md) | Model access configuration (local by default, admin-configurable) | Proposed |
| [0026](0026-seo.md) | SEO and discoverability | Proposed |
| [0027](0027-first-party-analytics.md) | First-party analytics | Proposed |
| [0028](0028-google-analytics-and-consent.md) | Google Analytics and consent | Proposed |
| [0029](0029-billing-and-payments.md) | Billing and payments (Stripe, prepaid credits) | Proposed |
| [0030](0030-authentication.md) | Authentication (Auth.js sign-in, signed API tokens) | Proposed |

New ADRs: run `/new-adr <title>` in Claude Code, or copy the structure of ADR-0001. Accepted ADRs are not edited; supersede them.
