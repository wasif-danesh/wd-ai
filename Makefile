CONTAINER_ENGINE ?= podman

.PHONY: dev down test lint format contracts kind-up
dev:
	$(CONTAINER_ENGINE) compose up --build
down:
	$(CONTAINER_ENGINE) compose down
test:
	uv run pytest
	pnpm test
lint:
	uv run ruff check . && uv run ruff format --check . && uv run pyright
	pnpm lint && pnpm typecheck
format:
	uv run ruff format . && uv run ruff check --fix .
contracts:
	@echo "Phase 1: export OpenAPI and run openapi-typescript" && exit 1
kind-up:
	@echo "Phase 2" && exit 1
