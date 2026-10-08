"""Media capabilities backed by ComfyUI workflows.

Phase 3: builds the job (workflow JSON with mapped inputs filled in) and hands it to a JobSink.
It never calls ComfyUI. Phase 4 swaps the sink for a Redis queue and adds the worker.
"""

from pathlib import Path
from typing import Any

from wd_platform_sdk.config import CapabilityBinding
from wd_platform_sdk.context import require_context
from wd_platform_sdk.jobs import JobHandle, JobRequest, JobSink
from wd_platform_sdk.workflows import Workflow


class ComfyUIProvider:
    def __init__(self, workflows_dir: Path, sink: JobSink):
        self._dir = workflows_dir
        self._sink = sink
        self._cache: dict[str, Workflow] = {}

    def _workflow(self, name: str) -> Workflow:
        if name not in self._cache:
            self._cache[name] = Workflow.load(self._dir, name)
        return self._cache[name]

    async def generate(
        self, capability: str, binding: CapabilityBinding, inputs: dict[str, Any]
    ) -> JobHandle:
        ctx = require_context()
        wf = self._workflow(binding.workflow or "")
        merged = {**binding.defaults, **inputs}
        graph = wf.fill(merged)
        request = JobRequest(
            tenant_id=ctx.tenant_id,
            product_id=ctx.product_id,
            user_id=ctx.user_id,
            run_id=ctx.run_id,
            thread_id=ctx.thread_id,
            capability=capability,
            workflow=wf.name,
            prompt=graph,
            inputs=merged,
            outputs={k: v.model_dump() for k, v in wf.map.outputs.items()},
        )
        await self._sink.submit(request)
        return JobHandle(job_id=request.job_id, capability=capability)
