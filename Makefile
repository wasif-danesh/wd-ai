CONTAINER_ENGINE ?= podman
export CONTAINER_ENGINE

.PHONY: test-comfyui test-integration setup setup-k8s preflight dev down logs migrate test lint format contracts helm-lint kind-up kind-test kind-e2e kind-down
setup:
	./scripts/setup.sh
setup-k8s:
	./scripts/setup.sh --k8s
preflight:
	./scripts/preflight.sh
dev:
	./scripts/dev.sh
logs:
	$(CONTAINER_ENGINE) compose logs -f
down:
	$(CONTAINER_ENGINE) compose down
	-./scripts/lipsync-server.sh stop
migrate:
	cd services/api && uv run alembic upgrade head   # needs postgres on localhost:5432
test:
	uv run pytest
	pnpm test
# Needs the stack running (make dev): real Postgres + pgvector, SeaweedFS, LiteLLM + Ollama.
test-integration:
	DATABASE_URL=postgresql+asyncpg://wd:wd@localhost:5432/wd \
	LITELLM_BASE_URL=http://localhost:4000 STORAGE_ENDPOINT=http://localhost:8333 \
	uv run pytest services/api/tests/integration -v
# Real generation on your local ComfyUI: an image, then (if installed) the product's own music and
# cover workflows (ACE-Step 1.5 and FLUX.2 klein). Slow on first use: models load into memory.
test-comfyui:
	COMFYUI_E2E=1 uv run pytest services/api/tests/integration/test_media_e2e.py services/api/tests/integration/test_real_models.py -v
lint:
	uv run ruff check . && uv run ruff format --check . && uv run pyright
	pnpm lint && pnpm typecheck
format:
	uv run ruff format . && uv run ruff check --fix .
contracts:
	uv run python scripts/export_openapi.py
	pnpm --filter @wd/contracts generate
helm-lint:
	@for f in "" "-f deploy/helm/wd-ai/values/local.yaml" "-f deploy/helm/wd-ai/values/staging.yaml -f deploy/helm/wd-ai/values/cloud/homelab.yaml" "-f deploy/helm/wd-ai/values/prod.yaml"; do \
		helm lint deploy/helm/wd-ai $$f >/dev/null && helm template t deploy/helm/wd-ai $$f >/dev/null && echo "ok: helm $$f" || exit 1; done
kind-up:
	./scripts/kind-up.sh
kind-e2e:
	uv run python scripts/kind-e2e.py   # makes something with each of the six products
kind-test:
	./scripts/kind-smoke.sh
kind-down:
	./scripts/kind-down.sh
