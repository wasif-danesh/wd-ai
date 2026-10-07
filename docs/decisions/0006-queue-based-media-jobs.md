# ADR-0006: Queue-based media generation

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Music, image and video generation take seconds to minutes and need a GPU. Blocking a graph node or HTTP request on them breaks checkpointing, scaling and UX.

## Decision

Media capabilities enqueue a job in Redis and store the job ID in graph state. A separate media worker drives ComfyUI (`/prompt` + WebSocket progress), uploads outputs to object storage, publishes progress over Redis pub/sub, and calls back the API to resume the graph.

## Consequences

- GPU concurrency is controlled by worker count (one job per GPU).
- KEDA can scale workers on queue depth, to zero in prod.
- More moving parts than a direct call; needs idempotent jobs and retry handling.
