# wd-ai

A self-hosted, cloud-portable platform for launching AI products quickly.

The platform core provides the shared machinery every AI product needs: an API with
streaming, a stateful agent runtime, a model gateway, GPU media workers, storage, and
(later) auth, billing and observability. Each product is a thin layer on top: a few
LangGraph graphs, a Next.js app, and a config file.

```
Browser ─► Next.js (UI + BFF) ─► FastAPI + LangGraph ─► LiteLLM ─► Ollama / vLLM
                                        │
                                        ├─► Postgres (pgvector, checkpoints, jobs)
                                        ├─► Redis (job queue, pub/sub) ─► Media worker ─► ComfyUI
                                        └─► Object storage (MinIO / S3 / GCS / Azure Blob)
```

## Products

| Product | Status | Description |
|---|---|---|
| [`wd-music-ai`](products/wd-music-ai/README.md) | Planned (MVP) | Turns a song idea into lyrics, a 60-second track and cover art |

## Environments

| Environment | Where | Purpose |
|---|---|---|
| Dev | MacBook (Apple Silicon), Podman | Day-to-day development |
| Staging | Home lab k3s, 24 GB NVIDIA GPU | Integration and test runs |
| Prod | Managed Kubernetes on AWS, GCP or Azure | Production |

The same container images run in all three. Only infrastructure and configuration differ.

## Documentation

| Doc | What it covers |
|---|---|
| [Architecture](docs/architecture.md) | Layers, components, request flow, scaling, future seams |
| [Tech stack](docs/tech-stack.md) | Every tool and what it is for |
| [Environments](docs/environments.md) | Dev, staging and prod setup; GPU strategy; delivery pipeline |
| [Configuration](docs/configuration.md) | Secrets, environment wiring, product config, swappable models |
| [SSE event contract](docs/contracts/sse-events.md) | The streaming protocol between API and frontend |
| [Roadmap](docs/roadmap.md) | Build phases and checklists |
| [Decisions](docs/decisions/README.md) | Architecture decision records (ADRs) |

## Getting started

Nothing is runnable yet. The repository is at the documentation stage; Phase 0 of the
[roadmap](docs/roadmap.md) creates the scaffold. When it lands, this section will cover:

1. Prerequisites: Podman + Podman Desktop, `uv`, `pnpm`, Node LTS, Ollama, ComfyUI.
2. `cp .env.example .env` and fill in local values.
3. `make dev` to start the stack.

## Principles

- **Same images everywhere.** Environment differences live in config, never in code.
- **Open source first.** Proprietary components need a clear reason.
- **Capabilities, not models.** Models are swappable through config.
- **Never block on the GPU.** Slow generation is always a background job.
- **Build for multi-tenancy and billing now**, even while there is one user.
