"""In-memory run manager: executes graphs, numbers events, supports replay by seq.

Phase 1 keeps the event log in process. Redis pub/sub fan-out (so any replica can serve
any stream) arrives with the media pipeline in Phase 4.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID, uuid4

from langgraph.types import Command
from wd_contracts import (
    DoneEvent,
    ErrorEvent,
    InterruptEvent,
    NodeEvent,
    TokenEvent,
)

log = logging.getLogger(__name__)


@dataclass
class Run:
    run_id: UUID
    thread_id: UUID
    product_id: str
    tenant_id: str
    user_id: str
    events: list[Any] = field(default_factory=list)
    cond: asyncio.Condition = field(default_factory=asyncio.Condition)
    task: asyncio.Task | None = None
    awaiting: str | None = None

    async def emit(self, cls, **kw) -> None:
        async with self.cond:
            ev = cls(run_id=self.run_id, thread_id=self.thread_id, seq=len(self.events) + 1, **kw)
            self.events.append(ev)
            self.cond.notify_all()


class RunManager:
    def __init__(self) -> None:
        self._runs: dict[UUID, Run] = {}

    def get(self, run_id: UUID) -> Run | None:
        return self._runs.get(run_id)

    def start(self, graph: Any, run: Run, graph_input: dict[str, Any]) -> Run:
        self._runs[run.run_id] = run
        run.task = asyncio.create_task(self._execute(graph, run, graph_input))
        return run

    def resume(self, graph: Any, run: Run, value: Any) -> None:
        run.awaiting = None
        run.task = asyncio.create_task(self._execute(graph, run, Command(resume=value)))

    def new_run(self, product_id: str, tenant_id: str, user_id: str, thread_id: UUID | None) -> Run:
        return Run(uuid4(), thread_id or uuid4(), product_id, tenant_id, user_id)

    async def _execute(self, graph: Any, run: Run, graph_input: Any) -> None:
        config = {
            "configurable": {
                "thread_id": str(run.thread_id),
                "tenant_id": run.tenant_id,
                "product_id": run.product_id,
                "user_id": run.user_id,
            }
        }
        try:
            async for mode, chunk in graph.astream(
                graph_input, config, stream_mode=["custom", "updates"]
            ):
                if mode == "custom":
                    await self._emit_custom(run, chunk)
                elif "__interrupt__" in chunk:
                    intr = chunk["__interrupt__"][0]
                    run.awaiting = intr.id
                    value = intr.value if isinstance(intr.value, dict) else {"value": intr.value}
                    await run.emit(
                        InterruptEvent,
                        interrupt_id=intr.id,
                        kind=value.get("kind", "interrupt"),
                        payload=value,
                    )
                    return
                else:
                    for node in chunk:
                        await run.emit(NodeEvent, node=node, status="completed", label=node)
            state = await graph.aget_state(config)
            await run.emit(DoneEvent, outputs=dict(state.values))
        except Exception:
            log.exception("run failed", extra={"run_id": str(run.run_id)})
            await run.emit(ErrorEvent, code="run_failed", message="The run failed.", retryable=True)

    async def _emit_custom(self, run: Run, chunk: dict[str, Any]) -> None:
        if chunk.get("type") == "token":
            await run.emit(TokenEvent, node=chunk["node"], text=chunk["text"])
        elif chunk.get("type") == "node":
            await run.emit(
                NodeEvent, node=chunk["node"], status=chunk["status"], label=chunk.get("label", "")
            )
