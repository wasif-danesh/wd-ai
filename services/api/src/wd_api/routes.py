import asyncio
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from wd_contracts import TERMINAL_EVENTS, ResumeRequest, RunRequest, format_sse

from wd_api.identity import Identity, get_identity
from wd_api.runs import Run

router = APIRouter()
HEARTBEAT_S = 15

SSE_HEADERS = {"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}


def _state(request: Request) -> Any:
    return request.app.state


async def _stream(run: Run, after: int, heartbeat_s: float) -> AsyncIterator[str]:
    sent = after
    while True:
        async with run.cond:
            if len(run.events) <= sent:
                try:
                    await asyncio.wait_for(run.cond.wait(), timeout=heartbeat_s)
                except TimeoutError:
                    yield ": ping\n\n"
                    continue
            batch = run.events[sent:]
        for ev in batch:
            yield format_sse(ev)
            sent = ev.seq
            if ev.event in TERMINAL_EVENTS:
                return
            if ev.event == "interrupt" and run.awaiting and ev.seq == len(run.events):
                return


def _sse(run: Run, request: Request, after: int = 0) -> StreamingResponse:
    return StreamingResponse(
        _stream(run, after, _state(request).heartbeat_s),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


def _owned_run(request: Request, run_id: UUID, identity: Identity) -> Run:
    run = _state(request).runs.get(run_id)
    if run is None or (run.tenant_id, run.user_id) != (identity.tenant_id, identity.user_id):
        raise HTTPException(404, "run not found")
    return run


@router.post("/products/{product_id}/runs")
async def start_run(
    product_id: str,
    body: RunRequest,
    request: Request,
    identity: Identity = Depends(get_identity),
):
    st: Any = _state(request)
    if product_id not in st.registry.products():
        raise HTTPException(404, "unknown product")
    run = st.runs.new_run(product_id, identity.tenant_id, identity.user_id, body.thread_id)
    st.runs.start(st.graphs[product_id], run, body.input)
    return _sse(run, request)


@router.get("/runs/{run_id}/events")
async def run_events(run_id: UUID, request: Request, identity: Identity = Depends(get_identity)):
    run = _owned_run(request, run_id, identity)
    last = request.headers.get("last-event-id", "0")
    return _sse(run, request, int(last) if last.isdigit() else 0)


@router.post("/runs/{run_id}/resume")
async def resume_run(
    run_id: UUID,
    body: ResumeRequest,
    request: Request,
    identity: Identity = Depends(get_identity),
):
    st: Any = _state(request)
    run = _owned_run(request, run_id, identity)
    if not run.awaiting:
        raise HTTPException(409, "run is not waiting for input")
    after = len(run.events)
    st.runs.resume(st.graphs[run.product_id], run, body.value)
    return _sse(run, request, after)
