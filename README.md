# wd-ai

A self-hosted, cloud-portable platform for launching AI products quickly.

The **platform core** provides the shared machinery every AI product needs: an API with
streaming, a stateful agent runtime, a model gateway, GPU media workers, storage, and
(later) auth, billing and observability. Each **product** is a thin layer on top: a few
LangGraph graphs, a Next.js UI and a config file.

> **Status: prototype.** Phases 0 and 1 are done: a walking skeleton streams a model reply
> from Ollama to the browser through every layer. Media generation, auth, Kubernetes and the
> first real product (`wd-music-ai`) are still to come. See the [roadmap](docs/roadmap.md).

## Contents

- [How it works](#how-it-works)
- [Products](#products)
- [Quick start](#quick-start)
- [Using the API](#using-the-api)
- [Project layout](#project-layout)
- [Configuration](#configuration)
- [Development](#development)
- [Environments](#environments)
- [Documentation](#documentation)
- [Principles](#principles)
- [Roadmap](#roadmap)

## How it works

```
Browser ─► Next.js (UI + BFF) ─► FastAPI + LangGraph ─► LiteLLM ─► Ollama / vLLM
                                        │
                                        ├─► Postgres (pgvector, checkpoints, jobs)
                                        ├─► Redis (job queue, pub/sub) ─► Media worker ─► ComfyUI
                                        └─► Object storage (MinIO / S3 / GCS / Azure Blob)
```

1. The browser talks only to the **Next.js** app. Its route handlers (the BFF) proxy to the API
   and pass the event stream through unchanged.
2. **FastAPI** runs the product's **LangGraph** graph and streams progress to the browser as
   Server-Sent Events: node status, tokens, interrupts, job progress, and a final result.
3. Graphs ask for **capabilities** (`text.chat`, later `music.generate`, `image.generate`),
   never for specific models. Config binds each capability to a provider.
4. Text goes through **LiteLLM**, an OpenAI-compatible gateway that maps aliases to Ollama
   (dev, staging) or vLLM / hosted APIs (prod).
5. Slow GPU work (music, images, video) is never awaited inline. The graph enqueues a job in
   **Redis**, a **media worker** drives ComfyUI, and the graph resumes when the job finishes.
6. Graph state is checkpointed in **Postgres**, so a run can pause for user input and resume.

### What works today

| Area | State |
|---|---|
| Streaming run API (`/products/{id}/runs`, reconnect, resume) | Working |
| LangGraph runtime with Postgres checkpointer, one-node `hello` graph | Working |
| LiteLLM gateway to local Ollama (`gpt-oss:20b`) | Working |
| Next.js page + BFF streaming tokens end to end | Working |
| Typed contracts: Pydantic models and generated TypeScript types | Working |
| Database migrations (tenants, users, threads, jobs, usage events) | Working |
| Container images and local compose stack | Working |
| Media worker, ComfyUI, object storage | Placeholder (Phase 3-4) |
| Auth, quotas, usage events written | Not started (Phase 3, 5) |
| Helm chart, local Kubernetes (kind), CI smoke test | Working |
| k3s home lab with Argo CD | Manifests and runbook written, not yet run (Phase 2) |

## Products

| Product | Status | Description |
|---|---|---|
| [`wd-music-ai`](products/wd-music-ai/README.md) | Planned (MVP) | Turns a song idea into lyrics, a 60-second track and cover art |

A product is a folder under `products/` with its `product.yaml`, graphs, prompts and ComfyUI
workflows. Adding a product adds no API endpoints: the graph registry exposes registered
graphs through the same generic routes.

## Quick start

On a fresh clone, two commands do everything:

```bash
git clone https://github.com/wasif-danesh/wd-ai.git && cd wd-ai
make setup      # installs missing tools, starts Podman + Ollama, pulls the model, creates .env
make dev        # starts the stack, waits for Postgres, runs migrations, follows logs
```

Then open http://localhost:3000 and press **Run**. A reply from the model streams into the page.

### Supported platforms

| Platform | Status |
|---|---|
| macOS (Apple Silicon and Intel) | Supported; Homebrew required |
| Linux: Debian, Ubuntu, Kali (apt), Fedora (dnf), Arch (pacman) | Supported; setup tested in Ubuntu and Fedora containers and in CI |
| Windows 10/11 | Supported **through WSL2** (Ubuntu); see [docs/windows.md](docs/windows.md). Untested on real Windows so far |

### What `make setup` does

It is idempotent (safe to re-run) and asks before every install or large download. Add `-y`
(`./scripts/setup.sh -y`) to accept everything without prompts. `make setup-k8s` does the same
and also installs `kind`, `helm` and `kubectl`.

1. Checks for `podman`, `uv`, `pnpm`, Node 22+, `ollama`, `curl`, `git`, `make`, `openssl` and a
   Compose provider, and installs what is missing:
   - **macOS:** Homebrew.
   - **Linux and WSL:** the distro package manager for system tools (`podman`, `git`, ...), plus
     official installers for the rest: `uv` and Ollama use their vendors' install scripts, and
     Node 22, `kind`, `helm` and `kubectl` are downloaded as binaries and **checksum-verified**
     into `~/.local/bin`. pnpm comes from Corepack. No Homebrew or sudo is needed for those.
2. Creates and starts the Podman VM on macOS, and checks it has enough memory (offers to resize).
3. Starts Ollama and pulls every model named in `deploy/compose/litellm.yaml`
   (`gpt-oss:20b`, about 13 GB). On Linux it also checks that containers can reach Ollama and
   offers a fix if not.
4. Creates `.env` from `.env.example` and generates random secrets. Nothing is printed.
5. Runs `uv sync --all-packages` and `pnpm install`.

The only thing it cannot do for you is install [Homebrew](https://brew.sh) on a Mac that lacks
it; it stops and tells you.

`make dev` runs `make preflight` first: a fast, read-only check that lists exactly what is
missing and points back to `make setup`.

### Hardware notes

- `gpt-oss:20b` needs about 16 GB of RAM and 20 GB of free disk. Setup warns when a machine is
  short. To use a smaller or faster model, change the `ollama_chat/...` entries in
  `deploy/compose/litellm.yaml`; setup and preflight read the model names from there.
- Ollama runs natively on the host so it can use the GPU. On Apple Silicon it uses Metal. On
  Intel Macs and machines without a supported GPU it runs on CPU, so replies are slow.
- Linux and WSL: Ollama listens on `127.0.0.1` by default, which containers may not reach.
  `make setup` tests this and, with your consent, makes Ollama listen on `0.0.0.0`. Ollama has no
  authentication, so restrict port 11434 with a host firewall.

### Services

| Service | URL |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (FastAPI) | http://localhost:8000 (`/health`, `/docs`) |
| LiteLLM | http://localhost:4000 |
| Postgres / Redis | `localhost:5432` / `localhost:6379` |

`make logs` follows container logs, and `make down` stops everything.

### Run on Kubernetes (kind)

Runs the same Helm chart used for staging, on a local cluster. `make setup-k8s` installs
`kind`, `helm` and `kubectl`; on macOS the Podman VM needs about 6 GB RAM (setup offers to
resize it). On Linux with rootless Podman see [runbooks/linux-kind.md](docs/runbooks/linux-kind.md).

```bash
make kind-up      # builds images, creates the cluster, installs the chart
make kind-test    # smoke test: migrations, web, and a streamed run
make kind-down    # delete the cluster
```

Open http://localhost:3000. Locally, pods use the Ollama already running on your machine;
in staging the chart runs Ollama in the cluster. Home lab setup with k3s and Argo CD:
[runbook](docs/runbooks/homelab-k3s.md).

### Develop with live reload

Start only the backing services, then run the API and web app natively:

```bash
podman compose up -d postgres redis litellm
DATABASE_URL=postgresql+asyncpg://wd:wd@localhost:5432/wd \
  LITELLM_BASE_URL=http://localhost:4000 \
  uv run uvicorn wd_api.main:app --reload --port 8000
API_BASE_URL=http://localhost:8000 pnpm --filter web dev      # in another terminal
```

## Using the API

All routes resolve an identity on every request (a stub user in dev until auth is wired).
Responses for runs are `text/event-stream`.

| Method and path | Purpose |
|---|---|
| `GET /health` | Liveness check (no identity needed) |
| `POST /products/{product_id}/runs` | Start a run; streams events. Body: `{"input": {...}, "thread_id"?: uuid}` |
| `GET /runs/{run_id}/events` | Reconnect to a run; honours `Last-Event-ID` |
| `POST /runs/{run_id}/resume` | Answer an `interrupt` (approve, edit); continues the stream. Body: `{"value": ...}` |

Try it without the browser, through the Next.js BFF:

```bash
curl -N -X POST localhost:3000/api/products/hello/runs \
  -H 'content-type: application/json' -d '{"input":{"message":"Say hi"}}'
```

You should see `node`, `token` ... and `done` events. Each message looks like:

```
id: 2
event: token
data: {"run_id":"…","thread_id":"…","seq":2,"ts":"…","node":"hello","text":"Hello"}
```

Event types are `node`, `token`, `interrupt`, `job_progress`, `error` and `done`. Full protocol:
[SSE event contract](docs/contracts/sse-events.md). Interactive docs are at
http://localhost:8000/docs.

## Project layout

```
wd-ai/
├─ apps/web/                 # Next.js app: UI + BFF route handlers
├─ services/
│  ├─ api/                   # FastAPI + LangGraph runtime (graphs, runs, identity, migrations)
│  └─ media-worker/          # Redis consumer that will drive ComfyUI (placeholder)
├─ packages/
│  ├─ contracts/             # Pydantic models: SSE events and request bodies (source of truth)
│  ├─ contracts-ts/          # TypeScript types generated from the OpenAPI schema
│  └─ platform-sdk/          # Capability interfaces, graph registry
├─ products/wd-music-ai/     # product.yaml, graphs/, prompts/, workflows/
├─ deploy/
│  ├─ compose/               # LiteLLM config for the local stack
│  ├─ helm/wd-ai/            # Helm chart + values overlays (local, staging, prod, cloud/*)
│  ├─ kind/                  # local cluster config
│  └─ argocd/                # Argo CD Application for staging
├─ scripts/                  # export_openapi.py (feeds TS type generation)
├─ docs/                     # architecture, ADRs, contracts, roadmap
├─ compose.yaml              # local dev stack
└─ Makefile                  # dev, test, lint, contracts, migrate
```

Python packages are snake_case (`wd_api`); folders and URLs are kebab-case.

## Configuration

There are three kinds of configuration, each with one home:

| Kind | Examples | Where |
|---|---|---|
| Secrets | API keys, DB passwords, `AUTH_SECRET` | `.env` (gitignored); keys are listed in `.env.example` |
| Environment wiring | `DATABASE_URL`, `LITELLM_BASE_URL`, `OLLAMA_BASE_URL`, `COMFYUI_BASE_URL` | `.env` locally, Helm values on Kubernetes |
| Product config | Model bindings, workflows, quotas | `products/<id>/product.yaml` |

Containers reach Ollama and ComfyUI on the host through `host.containers.internal`, because
containers on macOS cannot use the Metal GPU. Never commit `.env`; the repo and container
builds ignore it. More detail: [Configuration](docs/configuration.md).

## Development

```bash
make test        # Python (no GPU or network needed) + TypeScript tests
make lint        # ruff, pyright, Biome, tsc
make format      # ruff format + autofix
make contracts   # regenerate TS types from the API's OpenAPI schema
make setup       # one-time machine setup (see Quick start); setup-k8s adds kind/helm/kubectl
make preflight   # read-only readiness check
make dev / down  # start (with migrations) / stop the container stack
make migrate     # alembic upgrade head only (Postgres on localhost)
make helm-lint   # lint and render the chart with every overlay
make kind-up / kind-test / kind-down   # local Kubernetes (see above)
```

- **Tooling:** Python 3.12 with `uv`, `ruff`, `pyright`, `pytest`, Alembic. TypeScript with
  `pnpm`, Turborepo, Biome, Vitest, Next.js App Router in strict mode.
- **Contracts:** Pydantic models are the source of truth. Never hand-edit
  `packages/contracts-ts/src/schema.gen.ts`; run `make contracts`.
- **Tests:** graph tests use a fake capability provider, so they need no GPU or network.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org), scoped by area,
  e.g. `feat(api): ...`.
- **Containers:** use `${CONTAINER_ENGINE:-podman}` in scripts, never hard-code an engine.
  Images build for `linux/arm64` and `linux/amd64`.
- **CI:** GitHub Actions runs lint, typecheck and tests, then builds multi-arch images on
  `main`.

### Troubleshooting

| Symptom | Fix |
|---|---|
| No reply, or an error on the page | Check Ollama is up and lists the model: `curl localhost:11434/api/tags` |
| LiteLLM exits at start | `podman logs wd-ai-litellm-1`. It needs `LITELLM_API_KEY` set in `.env` |
| Port already in use | `make down`, then try again |
| Slow first reply | The model loads on first use, and `gpt-oss` is a reasoning model. Try a smaller model |
| `podman compose` cannot connect | Run `podman machine start` |
| `make dev` says "Not ready" | Run `make setup`; it fixes every item the preflight lists |

## Environments

| Environment | Where | Purpose |
|---|---|---|
| Dev | MacBook (Apple Silicon), Podman | Day-to-day development |
| Staging | Home lab k3s, 24 GB NVIDIA GPU | Integration and test runs |
| Prod | Managed Kubernetes, GCP first (AWS and Azure kept deployable) | Production |

The same container images run in all three. Only infrastructure and configuration differ.

## Documentation

| Doc | What it covers |
|---|---|
| [Architecture](docs/architecture.md) | Layers, components, request flow, scaling, future seams |
| [Tech stack](docs/tech-stack.md) | Every tool and what it is for |
| [Environments](docs/environments.md) | Dev, staging and prod setup; GPU strategy; delivery pipeline |
| [Configuration](docs/configuration.md) | Secrets, environment wiring, product config, swappable models |
| [SSE event contract](docs/contracts/sse-events.md) | The streaming protocol between API and frontend |
| [Windows (WSL2)](docs/windows.md) | Running the project on Windows |
| [Home lab runbook](docs/runbooks/homelab-k3s.md) | k3s, Argo CD and Tailscale setup for staging |
| [kind on Linux](docs/runbooks/linux-kind.md) | Rootless Podman prerequisites for the local cluster |
| [Roadmap](docs/roadmap.md) | Build phases and checklists |
| [Decisions](docs/decisions/README.md) | Architecture decision records (ADRs) |
| [`wd-music-ai`](products/wd-music-ai/README.md) | The first product's spec |

## Principles

- **Same images everywhere.** Environment differences live in config, never in code.
- **Open source first.** Proprietary components need a clear reason.
- **Capabilities, not models.** Models are swappable through config.
- **Never block on the GPU.** Slow generation is always a background job.
- **Build for multi-tenancy and billing now**, even while there is one user.

## Roadmap

| Phase | Goal | State |
|---|---|---|
| 0 | Foundations: monorepo, tooling, migrations, containers, CI | Done |
| 1 | Walking skeleton on the Mac: SSE contract, hello graph, LiteLLM, web streaming | Done |
| 2 | Skeleton on Kubernetes: Helm, `kind`, home lab k3s, Argo CD | Chart and kind done; home lab pending |
| 3 | Platform core: capability layer, storage, usage events | Planned |
| 4 | Media pipeline: Redis queue, worker, ComfyUI, GPU sharing | Planned |
| 5 | `wd-music-ai` MVP: song graph, auth, quota, UI | Planned |
| 6 | Production on GCP | Planned |

Details and checklists: [docs/roadmap.md](docs/roadmap.md).
