# ADR-0010: Capability-based, swappable model configuration

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Models (Qwen-Image, ACE-Step and future ones) must be easy to replace. `.env` is unsuitable for structured, reviewable model config.

## Decision

Graphs request capabilities (`text.<name>`, `image.generate`, `music.generate`, ...). `products/<id>/product.yaml` binds each to a provider (`litellm`, `comfyui`, later `http`; `fake` for tests). ComfyUI workflows are committed as API-format JSON with a `*.map.yaml` holding node IDs. Config merges code defaults → `product.yaml` → `product.<env>.yaml` → env var overrides, validated by Pydantic at startup. Secrets and environment wiring stay in env vars.

## Consequences

- Swapping a model is a config + workflow change, no Python.
- Bad config fails at deploy time.
- Map files must be kept in sync with workflow exports.
