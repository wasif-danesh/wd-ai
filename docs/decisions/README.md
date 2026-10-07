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

New ADRs: run `/new-adr <title>` in Claude Code, or copy the structure of ADR-0001. Accepted ADRs are not edited; supersede them.
