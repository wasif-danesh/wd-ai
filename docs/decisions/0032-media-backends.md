# ADR-0032: Media backends: local ComfyUI, Comfy Cloud and OpenAI-compatible image APIs

- **Status:** Accepted
- **Date:** 2026-10-08
- **Completes:** ADR-0025 (the media part)

## Context

ADR-0025 asked that an admin can choose how media models are reached, as they can for LLMs: the
product's ComfyUI workflow on the local machine, on Comfy Cloud, or on another service. Jobs were
built as ComfyUI graphs, and the worker could only run those on a ComfyUI server it was pointed at.

## Decision

- **A binding per product capability**, in Postgres (`media_bindings`, migration 0007): backend, its
  non-secret settings, and an encrypted API key. No binding means the product's own ComfyUI workflow
  on the local ComfyUI, exactly as before. The admin screens are `/admin/media`; the API is
  `/admin/media` (list, save, test, reset), all admin-only and audited without the key.
- **Three backends**, offered by capability family: `comfyui-local` (any ComfyUI server, an address
  can be set), `comfy-api` (Comfy Cloud, a serverless deployment or comfy-api-proxy, over Comfy API
  v2) and `openai-images` (any server with `POST /images/generations`; images only). The catalogue,
  validation and light checks live in the SDK (`media_backends.py`); the runners live in the worker.
- **Jobs carry what was asked** as well as the ComfyUI graph (`JobRequest.inputs`: prompt text, size,
  seed, lyrics, ...). ComfyUI backends use the graph; `openai-images` works from the inputs and
  ignores the workflow.
- **The worker chooses per job.** A router reads the binding for the job's tenant, product and
  capability (cached for three seconds), so a change applies to the next job. A database failure is a
  retryable error, never a silent switch to another backend; an unreadable key or an unknown backend
  fails the job with a generic message.
- **Remote backends are not our GPU.** They take no GPU lock and do not unload the LLMs. Usage
  records `media.remote_seconds` (wall time on the remote service) instead of `gpu.seconds`, and
  every job usage event carries the `backend`.
- **Comfy API v2 is poll-first.** Submit with `POST /api/v2/jobs`, poll `GET /api/v2/jobs/{id}` for
  status, progress and outputs, fetch each output from `/api/v2/assets/{id}/content`. That route
  answers with a redirect to a signed URL, which is fetched **without** the API key. A job that runs
  past the timeout is cancelled. Outputs are matched by the workflow map's node and kind.
- **Keys are encrypted by us** (Fernet, `MEDIA_SECRETS_KEY` from the environment, new dependency
  `cryptography`), because there is no gateway to hold them as there is for LLMs. They are write-only.
  Saving without a key keeps the saved one only if the backend is unchanged, so a key is never sent to
  a different service. Without `MEDIA_SECRETS_KEY` the admin area refuses to save a key; backends that
  need none still work. Changing the key makes saved keys unreadable (enter them again).
- **"Test connection" never generates anything**, because generations cost money on hosted backends.
  It checks that the service answers and accepts the credentials.
- **Failures map to safe messages**: 401 and 403 mean rejected credentials, 402 no credits,
  400 and 422 a rejected request, 429 and 5xx a retryable outage; nothing from the service's reply
  or any key reaches the user.

## Verified, and not

- Verified: unit tests for every runner and the router against mock servers; a real run through the
  running stack (admin API, Postgres, encrypted key, the real worker, a stand-in Comfy API v2 server
  on this machine, storage), including that the key reaches the API host and not the signed URL; and
  the default route on the real local ComfyUI.
- **Not verified against the real Comfy Cloud or a real OpenAI-compatible service.** That needs a paid
  Comfy Cloud key (also to learn whether it has our model files and what a song costs) and an image
  API key. The adapters follow the published API; expect small differences.

## Consequences

- New dependency: `cryptography`. New secret: `MEDIA_SECRETS_KEY` (`make setup`, `k8s-secrets.sh`).
- Music cannot yet run on an OpenAI-compatible service (there is no standard endpoint for it).
- Costs of hosted jobs are not recorded yet, only their duration; pricing waits for billing.
- A capability's bound backend is per tenant and product, not per user.
