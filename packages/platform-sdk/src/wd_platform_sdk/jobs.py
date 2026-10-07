"""Media jobs. Capabilities build a JobRequest and hand it to a JobSink; they never wait on the
GPU (rule 6). Phase 4 adds the Redis-backed sink and the worker that consumes it."""

from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import uuid4

from pydantic import BaseModel, Field


def _now() -> str:
    return datetime.now(UTC).isoformat()


class JobRequest(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    product_id: str
    user_id: str
    run_id: str | None = None
    capability: str
    workflow: str
    prompt: dict[str, Any]  # ComfyUI API-format graph with inputs filled in
    outputs: dict[str, Any]  # output name -> {node, type}, from the workflow map
    created_at: str = Field(default_factory=_now)


class JobHandle(BaseModel):
    job_id: str
    capability: str
    status: str = "queued"


class JobSink(Protocol):
    async def submit(self, request: JobRequest) -> None: ...


class InMemoryJobSink:
    """Collects submitted jobs; used in tests and until the Redis queue lands (Phase 4)."""

    def __init__(self) -> None:
        self.submitted: list[JobRequest] = []

    async def submit(self, request: JobRequest) -> None:
        self.submitted.append(request)
