CONTAINER_ENGINE ?= podman

.PHONY: dev down migrate test lint format contracts kind-up
dev:
	$(CONTAINER_ENGINE) compose up --build
down:
	$(CONTAINER_ENGINE) compose down
migrate:
	cd services/api && uv run alembic upgrade head   # needs postgres on localhost:5432
test:
	uv run pytest
	pnpm test
lint:
	uv run ruff check . && uv run ruff format --check . && uv run pyright
	pnpm lint && pnpm typecheck
format:
	uv run ruff format . && uv run ruff check --fix .
contracts:
	uv run python scripts/export_openapi.py
	pnpm --filter @wd/contracts generate
kind-up:
	@echo "Phase 2" && exit 1
