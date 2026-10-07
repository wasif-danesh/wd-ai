# ADR-0005: LiteLLM gateway for all LLM inference

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

LLM backends differ per environment (Ollama on the Mac and in staging, vLLM or hosted APIs in prod) and will change over time.

## Decision

All LLM calls go through LiteLLM's OpenAI-compatible API using model aliases. Application code never calls Ollama, vLLM or a vendor SDK directly.

## Consequences

- Swapping or adding an LLM backend is a LiteLLM config change.
- Spend tracking per key/alias is available for billing.
- One more service to run.
