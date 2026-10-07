# ADR-0004: Next.js frontend as BFF, SSE for streaming

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Products need a polished React UI. The browser must receive streamed tokens, node status and long-running job progress.

## Decision

Use React + Next.js. Next.js route handlers act as a backend-for-frontend: the browser talks only to Next.js, which proxies to FastAPI on the internal network. Streaming uses Server-Sent Events per `docs/contracts/sse-events.md`. Progress from workers reaches any API replica through Redis pub/sub.

## Consequences

- FastAPI is never exposed publicly; auth and CORS live in one place.
- SSE is one-way; user actions (resume, approve) are normal POSTs.
- The BFF must pass streams through unbuffered and uncompressed.
