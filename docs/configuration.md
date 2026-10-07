# Configuration

There are three kinds of configuration. Each has one home.

| Kind | Examples | Local | Kubernetes |
|---|---|---|---|
| **Secrets** | OAuth client secrets, DB passwords, API keys, `AUTH_SECRET` | `.env` (gitignored); keys listed in `.env.example` | Kubernetes Secret from External Secrets or SOPS |
| **Environment wiring** | `OLLAMA_BASE_URL`, `COMFYUI_BASE_URL`, `LITELLM_BASE_URL`, `DATABASE_URL`, bucket name | `.env` + `compose.yaml` | Helm values → ConfigMap |
| **Product config** | Model bindings, workflow choice, prompts, quotas | `products/<id>/product.yaml` (in Git) | Same file, baked into the image |

Application code reads secrets and wiring only through `pydantic-settings`, and product
config only through the validated product config model. Code never knows where a value
came from.

## Precedence

Later wins:

1. Defaults in code
2. `products/<id>/product.yaml`
3. `products/<id>/product.<env>.yaml` (optional, e.g. a lighter GGUF workflow in dev)
4. Environment variables with a nested prefix, for emergency overrides, e.g.
   `WD_MUSIC_AI__CAPABILITIES__MUSIC_GENERATE__WORKFLOW=ace-step-1.5-base`

The merged result is validated by one Pydantic model **at startup**. Validation also checks
that every referenced workflow and map file exists. A bad config fails the deploy, not a
user's request.

## Capabilities: swappable models

Graphs request capabilities. Config binds them to providers.

```yaml
# products/wd-music-ai/product.yaml
id: wd-music-ai
capabilities:
  text.lyrics:
    provider: litellm
    model: lyrics-writer          # a LiteLLM alias, not a raw model name
  music.generate:
    provider: comfyui
    workflow: ace-step-1.5-turbo
    defaults: { duration_s: 60 }
  image.generate:
    provider: comfyui
    workflow: qwen-image-fp8
    defaults: { width: 1024, height: 1024 }
quotas:
  songs_per_user_per_day: 10
```

```python
# graph code: no model names, no node IDs
track = await caps.music.generate(lyrics=lyrics, style=style, duration_s=60, seed=seed)
cover = await caps.image.generate(prompt=cover_prompt)
```

Capability calls for media **enqueue a job** and return a job handle. They never wait for
the GPU.

### Providers

| Provider | Used for | Notes |
|---|---|---|
| `litellm` | Text and structured output | OpenAI-compatible; model is a LiteLLM alias |
| `comfyui` | Image, music, video | Workflow JSON + map file |
| `http` *(later)* | Hosted media APIs | Same interface, for models ComfyUI can't run |
| `fake` | Tests | Deterministic outputs, no GPU or network |

Every provider implements the same small interface, registered by name (dispatcher /
registry pattern).

### LiteLLM aliases

LiteLLM's own config maps aliases to real backends per environment, e.g. `lyrics-writer` →
`ollama/qwen3:14b` in dev and staging, a vLLM endpoint or hosted model in prod. Changing the
underlying LLM never touches product config.

### ComfyUI workflows and map files

Workflows are exported from ComfyUI in **API format** and committed under
`products/<id>/workflows/`. ComfyUI identifies inputs by node ID, and those IDs change when a
workflow is rebuilt, so each workflow has a map file. Only the map file knows node IDs.

```yaml
# products/wd-music-ai/workflows/ace-step-1.5-turbo.map.yaml
workflow: ace-step-1.5-turbo.json
licence: "Verify on model card before launch (ADR-0012)"
models:                      # files the ComfyUI host must have
  - checkpoints/ace_step_1.5_turbo.safetensors
inputs:
  lyrics:     { node: "14", field: "lyrics" }
  style:      { node: "14", field: "tags" }
  duration_s: { node: "17", field: "seconds" }
  seed:       { node: "3",  field: "seed" }
outputs:
  audio: { node: "21", type: audio }
```

Node IDs above are placeholders; take real ones from the exported workflow.

**To swap a model:** build and export the new workflow, write its map file, change one line
in `product.yaml`, open a PR. No Python changes.

## Later

If runtime switching is needed (A/B tests, per-tenant models), the same schema can be stored
in Postgres and layered on top of `product.yaml`. Not needed for the MVP.
