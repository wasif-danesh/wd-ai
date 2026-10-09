# wd-ai

A self-hosted, cloud-portable platform for launching AI products quickly.

The **platform core** provides the shared machinery every AI product needs: an API with
streaming, a stateful agent runtime, a model gateway, GPU media workers, storage, and
auth, and (later) billing and observability. Each **product** is a thin layer on top: a few
LangGraph graphs, a Next.js UI and a config file.

> **Status: prototype.** The platform and four products work end to end on a laptop: **music**
> (lyrics you approve, a 60-second track and a cover), **images** (text to image, image to image),
> **video** (text to video, image to video, made in the background) and **text to speech** (eight
> languages including Bengali, a male and a female voice each). Everything made lands in one
> library, **My creations**, which you can search by meaning in any language. Models run through
> Ollama, ComfyUI and open speech servers. It runs in containers and installs on a local
> Kubernetes cluster from a Helm chart. Still to come: Speech to Text and Lip Sync (designed, not
> built), the home-lab (k3s + Argo CD) rollout, billing and a production deployment. See the
> [roadmap](docs/roadmap.md).

## Contents

- [How it works](#how-it-works)
- [Products](#products)
- [Quick start](#quick-start) (including [what to install first](#before-you-start-manual-prerequisites))
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
                                        │                                           └─► Speech servers (Kokoro, Indic Parler-TTS)
                                        └─► Object storage (SeaweedFS / S3 / GCS / Azure Blob)
```

1. The browser talks only to the **Next.js** app, which handles sign-in (Auth.js). Its route
   handlers (the BFF) check the session, attach a short-lived signed token, proxy to the API and
   pass the event stream through unchanged.
2. **FastAPI** runs the product's **LangGraph** graph and streams progress to the browser as
   Server-Sent Events: node status, tokens, interrupts, job progress, and a final result.
3. Graphs ask for **capabilities** (`text.chat`, `text.lyrics`, `music.generate`, `image.generate`, `speech.synthesize`),
   never for specific models. Config binds each capability to a provider.
4. Text goes through **LiteLLM**, an OpenAI-compatible gateway that maps aliases to Ollama
   (dev, staging) or vLLM / hosted APIs (prod).
5. Slow work (music, images, video, speech) is never awaited inline. The graph enqueues a job in
   **Redis**, a **media worker** drives ComfyUI (or a speech server), and the graph resumes when the job finishes.
6. Graph state is checkpointed in **Postgres**, so a run can pause for user input and resume.

### What works today

| Area | State |
|---|---|
| Streaming run API (`/products/{id}/runs`, reconnect, resume) | Working |
| LangGraph runtime with Postgres checkpointer, one-node `hello` graph | Working |
| LiteLLM gateway to local Ollama (default model `gemma4:e4b`) | Working |
| Next.js page + BFF streaming tokens end to end | Working |
| Typed contracts: Pydantic models and generated TypeScript types | Working |
| Database migrations (tenants, users, identities, threads, jobs, usage events, songs) | Working |
| Container images and local compose stack | Working |
| Capability layer (`litellm`, `comfyui`, `fake`), validated product config | Working |
| Usage events: token counts written per LLM call | Working |
| Image and audio input to the model (`Image`/`Audio` parts, files from storage); secure picture upload with choose, drag and drop, and paste ([ADR-0035](docs/decisions/0035-image-uploads.md), [ADR-0039](docs/decisions/0039-picture-input.md)) | Working; audio upload comes with Speech to Text |
| Object storage interface (S3 API via SeaweedFS), presigned URLs | Working locally; not in the Helm chart yet |
| RAG helpers on pgvector with embeddings (`nomic-embed-text`) | Working (library; no HTTP endpoints) |
| Media pipeline: Redis queue, worker, ComfyUI client, live `job_progress`, queue positions | Working; real ComfyUI verified locally (60 s song in about 77 s, 1024x1024 cover in about 25 s on an Apple Silicon Mac), GPU on k3s untested |
| Song graph: guardrail, lyrics, approval, music, cover, daily quota | Working with real models ([ADR-0022](docs/decisions/0022-song-graph-and-guardrail.md), [ADR-0024](docs/decisions/0024-real-model-validation.md)) |
| Song downloads: the MP3 with its cover and lyrics inside, the cover, and a video of the cover with the song playing ([ADR-0034](docs/decisions/0034-song-downloads.md)) | Working |
| Studio home ("WD AI Studio") with a card per product; inside a product a **side panel** (products, library, admin, breadcrumb, ⌘K search); `wd-music-ai` under `/music`, `wd-image-ai` under `/image`, `wd-video-ai` under `/video`, `wd-tts-ai` under `/text-to-speech` | Working ([ADR-0033](docs/decisions/0033-studio-home-and-product-urls.md), [ADR-0046](docs/decisions/0046-product-side-panel.md)) |
| **My creations** (`/creations`): songs, images, clips and speech together, as cards or a sortable table, with multilingual semantic search | Working ([ADR-0040](docs/decisions/0040-one-library.md), [ADR-0041](docs/decisions/0041-semantic-search.md)) |
| **Text to speech**: eight languages, a male and a female voice each (Kokoro; Bengali with Indic Parler-TTS), MP3 download | Working; Bengali was reviewed by a native listener and is slow on a CPU; Japanese and Chinese are not offered yet ([ADR-0042](docs/decisions/0042-text-to-speech.md)) |
| Web UI built from shadcn/ui, Tailwind CSS and TanStack Table, in light and dark | Working ([ADR-0045](docs/decisions/0045-ui-components.md)) |
| Sign-in (Auth.js with Google, GitHub, Microsoft; signed API tokens; users table) | Working; verified with a real GitHub login. Google and Microsoft are wired but not tried ([ADR-0030](docs/decisions/0030-authentication.md)) |
| Admin area (`/admin`): users, songs, usage, audit log, model access, as sortable, filterable, paged tables | Working; LLM providers (Gemini, Groq, Cerebras, OpenRouter, any OpenAI-compatible or LiteLLM model, or local) are changed at run time, the guardrail model is vetted first. Media backends (local ComfyUI, Comfy Cloud / Comfy API v2, OpenAI-compatible image APIs) are chosen per product capability at `/admin/media` ([ADR-0032](docs/decisions/0032-media-backends.md); tested against stand-in servers, not yet the real Comfy Cloud) |
| Helm chart, local Kubernetes (kind), CI smoke test | Working |
| k3s home lab with Argo CD | Manifests and runbook written, not yet run (Phase 2) |

## Products

| Product | Status | Description |
|---|---|---|
| [`wd-music-ai`](products/wd-music-ai/README.md) | MVP working | Turns a song idea into lyrics, a 60-second track and cover art |
| [`wd-image-ai`](products/wd-image-ai/README.md) | Working | Text to image and image to image on FLUX.2 klein 4B, with secure uploads |
| [`wd-video-ai`](products/wd-video-ai/README.md) | Working | Text to video and image to video (2 or 5 seconds) on LTX-Video 2B, made in the background |
| [`wd-tts-ai`](products/wd-tts-ai/README.md) | Working | Text to speech in eight languages with a male and a female voice (Kokoro; Bengali with Indic Parler-TTS) |
| Speech to Text, Lip Sync | Designed ([ADR-0043](docs/decisions/0043-speech-to-text.md), [ADR-0044](docs/decisions/0044-lip-sync.md)) | Shown as "Coming soon" on the home page |

A product is a folder under `products/` with its `product.yaml`, graphs, prompts and ComfyUI
workflows. Adding a product adds no API endpoints: the graph registry exposes registered
graphs through the same generic routes.

## Quick start

Do the [one-time prerequisites](#before-you-start-manual-prerequisites) for your platform, then
two commands do everything else:

```bash
git clone https://github.com/wasif-danesh/wd-ai.git && cd wd-ai
make setup      # installs missing tools, starts Podman + Ollama, pulls the model, creates .env
make dev        # starts the stack, waits for Postgres, runs migrations, follows logs
```

Then open http://localhost:3000, choose **Create a song**, describe a song, and watch it get written. You approve the lyrics, then
the music and cover are made. By default they are placeholders; set `COMFYUI_MODE=real` in `.env`
and run ComfyUI with the ACE-Step and FLUX.2 klein models for real ones (see
[products/wd-music-ai](products/wd-music-ai/README.md) and [Hardware notes](#hardware-notes)).

Sign-in is off by default (`AUTH_MODE=stub` in `.env.example`: everyone is the dev user). To turn it on,
set `AUTH_MODE=jwt`, the two secrets and a provider's client id and secret: see
[Sign-in in apps/web](apps/web/README.md#sign-in).

![The WD AI Studio home page: a card for each product](docs/images/home.jpg)

Inside a product the side panel is the navigation (the home page keeps its cards):

| Create | Review the lyrics | Your song |
|---|---|---|
| ![Create a song, with the side panel](docs/images/create.jpg) | ![Review and edit the lyrics](docs/images/review.jpg) | ![A finished song](docs/images/song.jpg) |

| Text to speech (Bengali) | My creations | The same, as a table |
|---|---|---|
| ![Text to speech in Bengali](docs/images/speech.jpg) | ![My creations as cards](docs/images/creations.jpg) | ![My creations as a sortable table](docs/images/creations-table.jpg) |

The admin area uses the same components for its data tables (sorting, a filter box, paging):

![The admin overview: usage tables](docs/images/admin.jpg)

If `make` is not installed yet (common on a fresh Linux box), run the script directly. It
installs `make` for you: `./scripts/setup.sh`, then `make dev`.

### Before you start (manual prerequisites)

`make setup` installs almost everything, but a few things must exist first because they need
administrator rights, a reboot, or are needed to run the setup at all. Do these once.

**Every platform**

- An internet connection, and about 15 GB of free disk (the default model is about 10 GB).
- 8 GB of RAM or more for the default `gemma4:e4b` model (16 GB is more comfortable). With less, switch to a smaller model
  (see [Hardware notes](#hardware-notes)).
- A GPU is optional. Apple Silicon (Metal) and NVIDIA GPUs speed up replies; CPU-only works but
  is slow.

**macOS**

1. Install [Homebrew](https://brew.sh).
2. Install Apple's command line tools (they provide `git` and `make`): `xcode-select --install`.

**Linux** (Debian, Ubuntu, Kali, Fedora, Arch and derivatives)

1. Use a distro with `apt`, `dnf` or `pacman`, and an account with `sudo`.
2. Install `git` (for example `sudo apt install git`). `make`, `curl` and `openssl` are installed
   by setup if missing.
3. For the local Kubernetes cluster only (`make kind-up`) with rootless Podman, enable cgroup
   delegation once: [runbooks/linux-kind.md](docs/runbooks/linux-kind.md).

**Windows 10 (22H2) or 11**: use WSL2 with Ubuntu. Native PowerShell and cmd are not supported.

1. Turn on hardware virtualisation in the BIOS/UEFI, and use an administrator account.
2. From an elevated PowerShell, run `wsl --install -d Ubuntu-24.04`, reboot if asked, and finish
   the Ubuntu first-run user setup.
3. Optional but recommended: enable systemd in Ubuntu (`printf '[boot]\nsystemd=true\n' | sudo tee /etc/wsl.conf`),
   then run `wsl --shutdown` from PowerShell and reopen Ubuntu.
4. For GPU acceleration, install a current NVIDIA driver on **Windows**, not inside Linux.
5. Clone the repo inside Ubuntu's own filesystem (`~`), not under `/mnt/c`, then follow the Linux
   steps above.

Details and tips: [docs/windows.md](docs/windows.md).

### Supported platforms

| Platform | Status |
|---|---|
| macOS (Apple Silicon and Intel) | Supported; Homebrew and Xcode command line tools required first |
| Linux: Debian, Ubuntu, Kali (apt), Fedora (dnf), Arch (pacman) | Supported; the tool installation is tested in Ubuntu and Fedora containers and in CI. Engine, Ollama and model steps are tested on macOS only |
| Windows 10/11 | Supported **through WSL2** (Ubuntu); see [docs/windows.md](docs/windows.md). Not yet tested on a real Windows machine |

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
3. Starts Ollama and pulls every model named in `services/api/src/wd_api/model_defaults.yaml`
   (`gemma4:e4b`, about 10 GB, plus `nomic-embed-text` and the multilingual `bge-m3`, about 1.5 GB together). On Linux it also checks that containers can reach Ollama and
   offers a fix if not.
4. Creates `.env` from `.env.example` and generates random secrets. Nothing is printed.
5. Runs `uv sync --all-packages` and `pnpm install`.

Anything it cannot do for you is listed under
[Before you start](#before-you-start-manual-prerequisites); the script stops with a message if
something is missing.

`make dev` runs `make preflight` first: a fast, read-only check that lists exactly what is
missing and points back to `make setup`.

### Hardware notes

- `gemma4:e4b` needs about 8 GB of RAM and 15 GB of free disk. Setup warns when a machine is
  short. To use a smaller or faster model, change the `ollama_chat/...` entries in
  `services/api/src/wd_api/model_defaults.yaml` (or switch a model at run time in `/admin/models`); setup and
  preflight read the model names from that file.
- Text to speech runs on the CPU in containers. English, Spanish, French, Hindi, Italian and Portuguese use
  Kokoro (small). **Bengali** uses Indic Parler-TTS, which needs about 4.5 GB of memory on its own and runs
  about five times slower than real time on a CPU, so give the Podman VM about **12 GB** (`podman machine set
  --memory 12288`). Its model is gated: accept the terms on its Hugging Face page and put a read token in
  `.env` as `HF_TOKEN` ([products/wd-tts-ai](products/wd-tts-ai/README.md)).
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
| Object storage (S3 API) | http://localhost:8333 |
| Speech servers: Kokoro and Whisper (Speaches) / Indic Parler-TTS | http://localhost:8100 / http://localhost:8101 |
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

All routes resolve an identity on every request: a signed token from the web app (`AUTH_MODE=jwt`,
the default) or the dev user (`AUTH_MODE=stub`, set in `.env.example` for local work).
Without a valid token every route except `/health` answers `401`. Responses for runs are `text/event-stream`.

| Method and path | Purpose |
|---|---|
| `GET /health` | Liveness check (no identity needed) |
| `POST /products/{product_id}/runs` | Start a run; streams events. Body: `{"input": {...}, "thread_id"?: uuid}` |
| `GET /runs/{run_id}/events` | Reconnect to a run; honours `Last-Event-ID` |
| `POST /runs/{run_id}/resume` | Answer an `interrupt` (approve, edit); continues the stream. Body: `{"value": ...}` |
| `GET /me` | The caller's user id, tenant and role |
| `GET /admin/media`, `PUT /admin/media/{product}/{capability}`, `POST .../test`, `.../reset` | Admin only: choose which backend runs a product's media capability; keys are write-only |
| `GET /admin/models`, `PUT /admin/models/{alias}`, `POST /admin/models/{alias}/test`, `/reset` | Admin only: see and change which provider and model serve each LiteLLM alias; keys are write-only |
| `GET /admin/users`, `/admin/songs`, `/admin/usage?days=`, `/admin/audit` | Admin only (`403` for others): users, songs from all users, usage totals, the audit log. Listing users is itself audited |
| `POST /products/{id}/uploads/images` (raw image body) | Store the user's picture (re-encoded, metadata-free) and return its key ([ADR-0035](docs/decisions/0035-image-uploads.md)) |
| `GET /creations/search?q=&kind=&limit=` | Search the signed-in user's own creations by meaning and exact words, in any language ([ADR-0041](docs/decisions/0041-semantic-search.md)); every list route also takes `ids=` |
| `POST /products/{id}/prompt/enhance` | Rewrite the user's prompt for the product's model ([ADR-0038](docs/decisions/0038-prompt-enhancement.md)) |
| `DELETE /products/{id}/uploads/images/{upload_id}` | Take back an uploaded picture ([ADR-0039](docs/decisions/0039-picture-input.md)) |
| `GET /products/wd-tts-ai/voices`, `GET /products/wd-tts-ai/speeches`, `GET/DELETE /products/wd-tts-ai/speeches/{id}`, `.../download` | The voice catalog (languages, male and female voices), and the signed-in user's speech with an MP3 download ([ADR-0042](docs/decisions/0042-text-to-speech.md)) |
| `GET /products/wd-video-ai/videos`, `GET/DELETE /products/wd-video-ai/videos/{id}`, `.../download` | The signed-in user's clips, including ones still being made ([ADR-0037](docs/decisions/0037-video-product.md)) |
| `GET /products/wd-image-ai/images`, `GET/DELETE /products/wd-image-ai/images/{id}`, `.../download` | The signed-in user's images ([ADR-0036](docs/decisions/0036-image-product.md)) |
| `GET /products/wd-music-ai/songs`, `GET /products/wd-music-ai/songs/{id}` | The signed-in user's songs, with presigned audio and cover links (product-provided routes, [ADR-0023](docs/decisions/0023-product-provided-routes.md)) |

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

The `hello` run also accepts `image_key` and/or `audio_key`: relative paths of files already in
your object storage (for example `uploads/cat.png`), which are sent to the multimodal model:

```bash
curl -N -X POST localhost:3000/api/products/hello/runs -H 'content-type: application/json' \
  -d '{"input":{"message":"What colour is this?","image_key":"uploads/green.png"}}'
```

There is no upload endpoint yet, so place the file with the storage interface for now
(see [ADR-0020](docs/decisions/0020-multimodal-input.md)).

Event types are `node`, `token`, `interrupt`, `job_progress`, `error` and `done`. Full protocol:
[SSE event contract](docs/contracts/sse-events.md). Interactive docs are at
http://localhost:8000/docs.

## Project layout

```
wd-ai/
├─ apps/web/                 # Next.js app (shadcn/ui, Tailwind, TanStack Table): product UIs, side panel, admin, BFF route handlers
├─ services/
│  ├─ api/                   # FastAPI + LangGraph runtime (graphs, runs, identity, migrations)
│  ├─ media-worker/          # Redis consumer that drives ComfyUI and the speech servers (stub or real mode)
│  └─ speech-indic/          # small speech server for Indic Parler-TTS (Bengali)
├─ packages/
│  ├─ contracts/             # Pydantic models: SSE events and request bodies (source of truth)
│  ├─ contracts-ts/          # TypeScript types generated from the OpenAPI schema
│  └─ platform-sdk/          # Capabilities, providers, product config, storage, usage, graph registry
├─ products/
│  ├─ hello/                 # sample product: config only (graph lives in the API)
│  ├─ media-demo/            # sample product: config only (one image job, used by the smoke tests)
│  ├─ wd-music-ai/           # product package: graph, guardrail, prompts, workflows, evals, tests
│  ├─ wd-image-ai/           # text to image and image to image
│  ├─ wd-video-ai/           # text to video and image to video
│  └─ wd-tts-ai/             # text to speech: voice catalog, graph, guardrail, tests
├─ deploy/
│  ├─ compose/               # LiteLLM config for the local stack
│  ├─ helm/wd-ai/            # Helm chart + values overlays (local, staging, prod, cloud/*)
│  ├─ kind/                  # local cluster config
│  └─ argocd/                # Argo CD Application for staging
├─ scripts/                  # setup, preflight, dev, kind and install helpers; export_openapi.py
├─ docs/                     # architecture, ADRs, contracts, roadmap
├─ compose.yaml              # local dev stack
└─ Makefile                  # setup, dev, test, lint, contracts, migrate, kind-*
```

Python packages are snake_case (`wd_api`); folders and URLs are kebab-case.

## Configuration

There are three kinds of configuration, each with one home:

| Kind | Examples | Where |
|---|---|---|
| Secrets | API keys, DB passwords, `AUTH_SECRET`, `API_AUTH_SECRET`, OAuth client secrets | `.env` (gitignored); keys are listed in `.env.example` |
| Environment wiring | `DATABASE_URL`, `LITELLM_BASE_URL`, `OLLAMA_BASE_URL`, `COMFYUI_BASE_URL` | `.env` locally, Helm values on Kubernetes |
| Product config | Model bindings, workflows, quotas | `products/<id>/product.yaml` |

Containers reach Ollama and ComfyUI on the host through `host.containers.internal`, because
containers on macOS cannot use the Metal GPU. Never commit `.env`; the repo and container
builds ignore it. More detail: [Configuration](docs/configuration.md).

## Development

```bash
make test        # Python (no GPU or network needed) + TypeScript tests
make test-integration   # real Postgres/pgvector, Redis pipeline, SeaweedFS, LiteLLM + Ollama (needs make dev)
make test-comfyui       # opt-in: a real image, song and cover on your local ComfyUI (slow first time)
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
  `pnpm`, Turborepo, Biome, Vitest, Next.js App Router in strict mode. UI: shadcn/ui (Radix) with Tailwind CSS, react-hook-form and Zod for forms, TanStack Table for data grids ([ADR-0045](docs/decisions/0045-ui-components.md)); `apps/web/app/tailwind.css` is the only stylesheet.
- **Contracts:** Pydantic models are the source of truth. Never hand-edit
  `packages/contracts-ts/src/schema.gen.ts`; run `make contracts`.
- **Tests:** graph tests use a fake capability provider, so they need no GPU or network.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org), scoped by area,
  e.g. `feat(api): ...`.
- **Containers:** use `${CONTAINER_ENGINE:-podman}` in scripts, never hard-code an engine.
  Images build for `linux/arm64` and `linux/amd64`.
- **CI:** GitHub Actions runs lint, typecheck and tests, a `setup` job on Ubuntu and macOS, a
  Helm lint and `kind` smoke test, and on `main` builds and pushes multi-arch images.

### Troubleshooting

| Symptom | Fix |
|---|---|
| No reply, or an error on the page | Check Ollama is up and lists the model: `curl localhost:11434/api/tags` |
| LiteLLM exits at start | `podman logs wd-ai-litellm-1`. It needs `LITELLM_API_KEY` set in `.env` |
| Port already in use | `make down`, then try again |
| Slow first reply | The model loads into memory on first use. CPU-only machines are slower; try `gemma4:e2b` |
| Empty reply with a small `max_tokens` | Gemma 4 "thinking" uses the token budget. It is off for the chat and lyrics aliases; keep budgets generous for the `moderator` ([ADR-0018](docs/decisions/0018-default-text-model-gemma4-e4b.md)) |
| Every model call fails with "model not found" right after start | The API seeds the model aliases into LiteLLM when it starts; give it a minute and check `podman logs wd-ai-api-1`. `LITELLM_API_KEY` must match between the API and LiteLLM |
| "API keys can't be saved yet" in `/admin/media` | `MEDIA_SECRETS_KEY` is missing: run `make setup`, then restart the API and the worker |
| `make dev` fails with "LITELLM_SALT_KEY" | Run `make setup`; it generates the key. Never change it afterwards: saved provider keys are encrypted with it |
| `podman compose` cannot connect | Run `podman machine start` |
| `make dev` says "Not ready" | Run `make setup`; it fixes every item the preflight lists |
| Sign-in page says "No sign-in provider is set up" | Set a provider's `AUTH_<PROVIDER>_ID` and `_SECRET` in `.env`, or `AUTH_MODE=stub` for local work |
| Sign-in fails with `redirect_uri_mismatch` or "Server error: problem with the server configuration" | Set `AUTH_URL=http://localhost:3000` and register `http://localhost:3000/api/auth/callback/<provider>` with the provider. In a container the server otherwise reports `0.0.0.0` |
| API refuses to start: "AUTH_MODE=jwt needs API_AUTH_SECRET" | Put the same 32+ byte `API_AUTH_SECRET` (`openssl rand -hex 32`) in the API and web environment, or set `AUTH_MODE=stub` |
| `command not found` right after setup (Linux, WSL) | Tools are installed in `~/.local/bin`. Add it to your PATH (`export PATH="$HOME/.local/bin:$PATH"` in `~/.profile`) and reopen the shell |
| `make kind-up` fails on Linux with rootless Podman | Enable cgroup delegation: [runbooks/linux-kind.md](docs/runbooks/linux-kind.md) |
| WSL is slow or runs out of memory | Keep the repo under `~`, not `/mnt/c`, and raise the limit in `.wslconfig` ([docs/windows.md](docs/windows.md)) |

## Environments

| Environment | Where | Purpose |
|---|---|---|
| Dev | macOS, Linux or Windows (WSL2), Podman | Day-to-day development |
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
| [Roadmap](docs/roadmap.md) | Build phases, checklists and planned work |
| [Decisions](docs/decisions/README.md) | Architecture decision records (ADRs) |
| [`wd-music-ai`](products/wd-music-ai/README.md) | The first product's spec |
| [`wd-image-ai`](products/wd-image-ai/README.md) | Text to image and image to image |
| [`wd-video-ai`](products/wd-video-ai/README.md) | Text to video and image to video |
| [`wd-tts-ai`](products/wd-tts-ai/README.md) | Text to speech |
| [`apps/web`](apps/web/README.md) | The web app: components, side panel, styling, sign-in |

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
| 3 | Platform core: capability layer, storage, usage events, RAG | Done |
| 4 | Media pipeline: Redis queue, worker, ComfyUI, GPU sharing | Done except GPU on k3s (needs the lab) |
| 5 | `wd-music-ai` MVP: song graph, auth, quota, UI, real models | Done |
| 5b | Image, video and text-to-speech products, one searchable library, shadcn/ui front end | Done; Speech to Text and Lip Sync designed, not built |
| 6 | Production on GCP | Planned |

Planned next: Speech to Text ([ADR-0043](docs/decisions/0043-speech-to-text.md)) and Lip Sync
([ADR-0044](docs/decisions/0044-lip-sync.md)), the other Indic languages for text to speech, and the proposed ADRs: SEO, first-party analytics and
Google Analytics ([0026](docs/decisions/0026-seo.md), [0027](docs/decisions/0027-first-party-analytics.md),
[0028](docs/decisions/0028-google-analytics-and-consent.md)), and billing with Stripe
([0029](docs/decisions/0029-billing-and-payments.md)).

Details and checklists: [docs/roadmap.md](docs/roadmap.md).
