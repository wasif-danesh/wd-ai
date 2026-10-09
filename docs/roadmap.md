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

- [x] Helm chart with `base` / `env` / `cloud` values (`deploy/helm/wd-ai`, ADR-0016)
- [x] Install to `kind` locally (`make kind-up`, `make kind-test`)
- [x] CI smoke test on `kind` (`helm-kind` job gates the image push)
- [x] In-cluster Ollama pulls its model into a PVC (tested on kind with a small model)
- [ ] Home lab: k3s, Argo CD, Tailscale. Manifests and [runbook](runbooks/homelab-k3s.md) are
      written; execute them on the lab (or a stand-in Linux box) and record the result
- [ ] Follow-up: roll out new staging images automatically (pinned tags or Image Updater)

## Phase 3: Platform core

- [x] Capability layer: `litellm`, `comfyui` (stubbed), `fake` providers; product config
      loading and validation (ADR-0017)
- [x] Storage interface (obstore) with an S3-compatible adapter; SeaweedFS replaces MinIO, whose
      community image was withdrawn
- [x] pgvector + RAG helpers (not needed by `wd-music-ai`, but part of the core)
- [x] Usage events written for LLM calls
- [ ] Follow-up (Phase 4): deploy object storage in the Helm chart when the media worker needs it

## Phase 4: Media pipeline

- [x] Redis queue, media worker, job completion that resumes graphs (ADR-0021)
- [x] ComfyUI client (`/prompt` + WebSocket progress), workflow + map loading; verified against
      a fake server and a real local ComfyUI (a real image, `make test-comfyui`)
- [x] Progress over Redis → SSE `job_progress` with queue positions; run events in Redis Streams
      so any API replica can serve or resume a run
- [x] LLM unload before generation; one job at a time per GPU id; retries and idempotent redelivery
- [x] Object storage and the worker in the Helm chart (SeaweedFS); stub mode runs the whole flow
      without a GPU, on kind and in CI
- [ ] GPU Operator with time-slicing on k3s; ComfyUI and Ollama pods: manifests and steps are
      written (`deploy/k8s/gpu-time-slicing.yaml`, `comfyui.*` chart values, runbook) but need
      the GPU host to be tested. Also needs a ComfyUI container image chosen for your GPU

## Phase 5: `wd-music-ai` MVP

See [product spec](../products/wd-music-ai/README.md).

- [x] Song graph: guardrail → lyrics → approve → music job → cover job → done, with per-user
      daily quota, validated and streamed lyrics, `songs` table (migration 0004); tested with a
      scripted fake model and end to end with the real model, Postgres, Redis and a stub worker
- [x] Guardrail evaluation on `gemma4:e4b` (results in ADR-0022)
- [x] ACE-Step 1.5 and FLUX.2 klein 4B workflows + map files, run for real on ComfyUI 0.39 and
      through the UI (results and licences in ADR-0024)
- [x] Auth.js with Google, GitHub, Microsoft; FastAPI validates the token, users table (ADR-0030).
      Verified with a real GitHub login (Google and Microsoft are wired but not tried)
- [x] UI: idea form, live lyric streaming, review and edit, progress with queue position, player,
      cover, downloads, "My songs", song page (see `apps/web/README.md`); verified in a browser against
      the real model; reload and reconnect recovery
- [x] Read API for "My songs" as product-provided routes (ADR-0023)
- [x] Song downloads (ADR-0034): real file downloads, the MP3 with cover art and lyrics in its tag, an MP4
      video of the cover with the song playing
- [x] Studio home "WD AI Studio" with a card per product, `/music` area, "Coming soon" pages for image and
      video, sign-in asked when a visitor opens music (ADR-0033)
- [x] Secured upload endpoint for images (ADR-0035): identity required, size/type/pixel limits,
      re-encoded without metadata, hourly limit, swept after 24 hours. Audio uploads are not designed yet
- [x] Image product `wd-image-ai` (ADR-0036): text to image and image to image on FLUX.2 klein 4B, guardrail
      on prompt and picture, My images, downloads, delete. Output screening is not in the first version

- [x] Video product `wd-video-ai` (ADR-0037): text to video and image to video on LTX-Video 2B, 2 or 5
      second clips made in the background, with a header badge and a notice when a clip is ready
- [x] Prompt enhancement on every product (ADR-0038) and a shared picture input: choose, drag and drop, paste
      (ADR-0039)

## Phase 6: Production

- [x] Choose the primary cloud: GCP
- [ ] OpenTofu module for it; add-ons; workload identity; External Secrets
- [ ] vLLM or hosted LLM via LiteLLM; KEDA scale-to-zero GPU workers
- [ ] Promotion flow from staging to prod

## Backlog (not yet scheduled)

- [x] Every screen is built from shadcn/ui and Tailwind (ADR-0045); the old hand-written stylesheet is deleted and
      `app/tailwind.css` holds only the tokens, the theme and a few base styles
- [ ] Side panel follow-ups (ADR-0046): pinning and reordering, a shared prompt bar for the creation products (needs its own ADR)

- [x] Text to Speech (ADR-0042): Kokoro in 7 languages and Bengali by Indic Parler-TTS, in My creations and search.
      Known gaps: Bengali awaits native review, the other Indic languages, Japanese and Chinese (Speaches cannot make them), no male French voice, Spanish and
      Portuguese voices are graded low, no `/admin/media` entry for the speech server
- [ ] Speech products, in this order, each designed by an ADR and each shown as a Coming-soon card on the home
      page: Text to Speech (ADR-0042, introduces the speech runtime), Speech to Text (ADR-0043, adds audio and
      video upload and recording, and chunked search), Lip Sync (ADR-0044, needs both; its safety policy needs
      your confirmation). Each ADR lists the evaluation to run before it is accepted
- [ ] Audio uploads (the image upload endpoint exists; ADR-0035): designed in ADR-0043
- [ ] Screen finished images and clips before showing them; measure the picture guardrail on unsafe pictures
- [ ] Evaluate audio input on real recordings, not only synthetic speech (ADR-0020)
- [ ] Pin the SeaweedFS image to a version instead of `:latest`
- [ ] Roll out new staging images automatically (pinned tags or Image Updater)

## Planned and recorded (ADRs proposed, not scheduled)

- [x] Admin foundation (ADR-0025 step 1): `/me`, `require_admin`, audit log (migration 0006), `/admin`
      with users, songs, usage and audit log
- [x] Model access, LLM part (ADR-0025 step 2): aliases seeded into LiteLLM's database, `/admin/models`
      with test connection, save, reset and the moderator canary; keys write-only
- [x] Model access, media part (ADR-0032): backends for the media worker (local ComfyUI, Comfy Cloud /
      Comfy API v2, OpenAI-compatible images) chosen per product capability at `/admin/media`
- [ ] Try the media backends against the real services: a paid Comfy Cloud key (do our ACE-Step and klein
      files exist there, and what does a song cost?) and an image API key
- [x] Semantic search in My creations: multilingual (bge-m3) vectors plus an exact-word check over a per-user index (ADR-0041). Every future creation kind must be indexed (checklist in the ADR)
- [ ] Move the RAG helper to a multilingual embedder (768 to 1024 dimensions, new migration; ADR-0041 known issue 4)
- [ ] Billing and pricing: credits ledger, payment provider, cost on usage events (ADR-0029: Stripe, prepaid credits)
- [ ] SEO and shareable song pages (ADR-0026)
- [ ] First-party analytics: page views, logins, privacy-safe IP handling (ADR-0027)
- [ ] Google Analytics behind a consent banner, off by default (ADR-0028)
- [ ] Legal basics: terms, privacy policy, data deletion, takedown process

## Deferred (seams already in place)

Central OIDC broker, billing provider, observability backends (Grafana stack, Langfuse),
further clouds, video generation.
