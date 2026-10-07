# ADR-0025: Hosted inference: no GPU in the cloud or home lab

- **Status:** Proposed
- **Date:** 2026-10-08

## Context

The first deployments (GCP and the k3s home lab) should have no GPU. The core stack (Next.js,
FastAPI/LangGraph, LiteLLM, Postgres/pgvector, Redis, object storage) runs on cheap CPU nodes;
text and media generation are bought from hosted providers, paid only when a job runs. LiteLLM
aliases (rule 5) and the media worker (rule 6) already isolate both seams, so no graph or product
code should change. Local Ollama and ComfyUI stay as the dev overlay and as a later self-hosted
option.

## Research (2026-10-08, from vendor pages and search results; re-verify before building)

- **Comfy Cloud API.** Runs API-format workflows through `https://cloud.comfy.org` with an
  `X-API-Key` header; supports input upload, output download, queue status and WebSocket
  progress. Needs a **paid subscription** (free tier excluded). Errors: 402 insufficient credits,
  429 inactive subscription. The v1 API is **deprecated in favour of Comfy API v2**; build on v2.
  Billing is credits, charged for active GPU time only. Inputs and outputs are kept 24 hours, so
  we must copy results to our own storage immediately. Comfy Router (unified media-model API)
  does not yet front workflows.
- **Unconfirmed:** whether Cloud has the exact files our workflows use (ACE-Step 1.5 Turbo AIO
  checkpoint, FLUX.2 klein 4B, its VAE and `qwen_3_4b`); credit price per song; concurrency
  limits; commercial-use terms for outputs.
- **Gemini free tier.** Prompts and responses may be used (with human review) to improve Google
  products; apps serving users in the EEA, Switzerland or the UK must use paid services only.
  Rate limits are low and change often.
- **Groq and Cerebras free tiers.** Permanent but limited (about 30 requests per minute); meant
  for prototyping, not production traffic.
- **Payments.** Paddle and Lemon Squeezy are merchants of record (they handle global tax) at
  about 5% + $0.50 per transaction; Lemon Squeezy adds surcharges for international cards and
  PayPal, and Paddle may not suit very small payments. Stripe is a processor: cheaper per
  transaction, but we are the seller and handle tax. See the billing ADR (to follow).

## Decision (proposed)

1. **Hosted-inference overlay.** A Helm overlay and compose profile with no Ollama or ComfyUI
   dependency. LiteLLM routes each alias to hosted providers with fallbacks and retries; the
   media worker gains a `COMFYUI_MODE=cloud` runner for Comfy API v2. Same images, env vars only
   (rule 1).
2. **Free tiers are for development only.** Production uses paid tiers with a hard monthly
   budget (LiteLLM budgets plus our own daily spend circuit breaker). User content never goes to
   a free tier that trains on it.
3. **Copy outputs out immediately** to `ScopedStorage`; never serve provider URLs.
4. **Cost on every usage event.** Add `cost_usd` (or provider credits) to LLM and job usage
   events so the price per song can be measured, not guessed.
5. **Re-run the guardrail evaluation** (ADR-0022) for any hosted moderator model before it is
   used; fail closed stays.
6. **Provider approval** (rule 12): Comfy Cloud and the hosted LLM providers are proprietary
   services; this ADR records that approval once accepted.
7. **GPU on k3s (Phase 4) is deferred**, not dropped: the cloud runner and the local runner share
   one interface.

## Open questions

- Do Comfy Cloud's models match our workflows, or do we keep the product on the local runner and
  use Comfy Router models instead? Test with a paid key before accepting this ADR.
- Which hosted LLM first (paid Gemini, Ollama Cloud, others), after the guardrail eval?
- Home lab: hosted inference too, or keep local Ollama for privacy and zero cost?

## Consequences

- Fixed cost falls to the CPU nodes; variable cost tracks usage and is billable.
- A provider outage or price change affects us, so aliases need fallbacks and the budget breaker.
- User prompts and lyrics reach third parties: the privacy policy must say so.
