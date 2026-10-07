# Roadmap

Build a **walking skeleton** first: the thinnest slice through every layer, deployed to
Kubernetes early. The riskiest assumptions are portability and the delivery pipeline, so
prove them while the code is small.

## Phase 0: Foundations

- [ ] Git repo, monorepo layout (see `CLAUDE.md`), `.gitignore`, `.env.example`
- [ ] uv workspace (`services/api`, `services/media-worker`, `packages/*`, `products/*`)
- [ ] pnpm + Turborepo workspace (`apps/web`, generated contracts package)
- [ ] Lint, format, typecheck, test tooling; `Makefile` with `dev`, `test`, `lint`, `contracts`
- [ ] `pydantic-settings` config; structured JSON logging with request IDs
- [ ] First Alembic migration: tenants, users, products, threads, jobs, usage_events (all with
      `tenant_id` / `product_id`)
- [ ] `Containerfile` per service; `compose.yaml`; engine-neutral scripts
- [ ] GitHub Actions: lint, test, Buildah multi-arch build, push to GHCR
- [ ] Update `CLAUDE.md` Commands section

## Phase 1: Walking skeleton on the Mac

- [x] Finalise the [SSE contract](contracts/sse-events.md) as Pydantic models; generate TS types
- [x] FastAPI `/products/{id}/runs` with SSE; stub identity; Postgres checkpointer
- [x] Graph registry; a one-node `hello` graph
- [x] LiteLLM container with an alias pointing at native Ollama
- [x] Next.js page + BFF route handler streaming tokens end to end

## Phase 2: Skeleton on Kubernetes

- [ ] Helm chart(s) with `base` / `env` / `cloud` values
- [ ] Install to `kind` locally, then CI smoke test on `kind`
- [ ] Home lab: k3s, Argo CD, Tailscale; Argo CD syncs the chart
- [ ] CPU Ollama with a small model is enough here; no GPU needed yet

## Phase 3: Platform core

- [ ] Capability layer: `litellm`, `comfyui` (stubbed), `fake` providers; product config
      loading and validation
- [ ] Storage interface with MinIO adapter
- [ ] pgvector + RAG helpers (not needed by `wd-music-ai`, but part of the core)
- [ ] Usage events written for LLM calls

## Phase 4: Media pipeline (when the GPU arrives)

- [ ] Redis queue, media worker, job callbacks that resume graphs
- [ ] ComfyUI client (`/prompt` + WebSocket progress), workflow + map loading
- [ ] Progress over Redis pub/sub → SSE `job_progress`
- [ ] GPU Operator with time-slicing on k3s; ComfyUI and Ollama pods
- [ ] LLM unload before generation; one job at a time per GPU

## Phase 5: `wd-music-ai` MVP

See [product spec](../products/wd-music-ai/README.md).

- [ ] Song graph: guardrails → lyrics → approve → music job → cover job → done
- [ ] ACE-Step 1.5 and Qwen-Image workflows + map files (licences verified)
- [ ] Auth.js with Google, GitHub, Microsoft; FastAPI validates the token
- [ ] Per-user daily quota
- [ ] UI: idea form, lyrics editor, queue position, player, cover, history

## Phase 6: Production

- [x] Choose the primary cloud: GCP
- [ ] OpenTofu module for it; add-ons; workload identity; External Secrets
- [ ] vLLM or hosted LLM via LiteLLM; KEDA scale-to-zero GPU workers
- [ ] Promotion flow from staging to prod

## Deferred (seams already in place)

Central OIDC broker, billing provider, observability backends (Grafana stack, Langfuse),
further clouds, video generation.
