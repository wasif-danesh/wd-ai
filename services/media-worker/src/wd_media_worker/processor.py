"""Runs one job: take the GPU, free it of LLMs, generate, store the outputs, report."""

import logging
import mimetypes
import time
from typing import Any, Protocol

import httpx
from wd_platform_sdk import (
    EventLog,
    JobError,
    JobOutput,
    JobRequest,
    JobResult,
    Storage,
    UsageEvent,
    UsageRecorder,
    object_key,
)
from wd_platform_sdk.jobs import progress_event
from wd_platform_sdk.usage import record_safely
from websockets.exceptions import WebSocketException

from wd_media_worker.comfy import ComfyClient, ComfyError, ProgressFn
from wd_media_worker.gpu import GpuLock, unload_llms
from wd_media_worker.settings import WorkerSettings
from wd_media_worker.state import JobState
from wd_media_worker.stub import run_stub

log = logging.getLogger(__name__)

PROGRESS_MIN_INTERVAL_S = 0.3
JOB_COMPLETED = "job.completed"
GPU_SECONDS = "gpu.seconds"

# What a runner returns: output name -> (bytes, content type, file extension)
Files = dict[str, tuple[bytes, str, str]]


class RetryJob(Exception):
    """The backend was unreachable; run the job again later."""

    def __init__(self, attempt: int, reason: str):
        super().__init__(reason)
        self.attempt = attempt


class Runner(Protocol):
    async def run(self, job: JobRequest, on_progress: ProgressFn) -> Files: ...


class ComfyRunner:
    def __init__(self, client: ComfyClient, timeout_s: float):
        self._client = client
        self._timeout = timeout_s

    async def run(self, job: JobRequest, on_progress: ProgressFn) -> Files:
        outputs = await self._client.run(job.prompt, job.job_id, on_progress, self._timeout)
        files: Files = {}
        for name, spec in job.outputs.items():
            f = self._client.pick(outputs, str(spec["node"]), spec.get("type", "image"))
            ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else "bin"
            ctype = mimetypes.guess_type(f.filename)[0] or "application/octet-stream"
            files[name] = (await self._client.fetch(f), ctype, ext)
        await self._client.free()
        return files


class StubRunner:
    async def run(self, job: JobRequest, on_progress: ProgressFn) -> Files:
        return await run_stub(job.job_id, job.outputs, on_progress)


_TRANSIENT = (
    httpx.TransportError,
    ConnectionError,
    OSError,
    WebSocketException,
)


class JobProcessor:
    def __init__(
        self,
        settings: WorkerSettings,
        log_: EventLog,
        storage: Storage,
        usage: UsageRecorder,
        runner: Runner,
        gpu: GpuLock,
        state: JobState,
        http: httpx.AsyncClient | None = None,
    ):
        self.s = settings
        self.log = log_
        self.storage = storage
        self.usage = usage
        self.runner = runner
        self.gpu = gpu
        self.state = state
        self._http = http or httpx.AsyncClient(timeout=30)

    async def emit(self, job: JobRequest, status: str, **kw: Any) -> None:
        if event := progress_event(job, status, **kw):
            await self.log.append(job.tenant_id, job.run_id or "", event)

    async def process(self, job: JobRequest) -> JobResult:
        """Returns the job's final result. Raises RetryJob for transient infrastructure failures."""
        if prior := await self.state.finished(job.tenant_id, job.job_id):
            return prior  # redelivered after a crash: report the same result again
        attempt = await self.state.begin(job.tenant_id, job.job_id)
        await self.emit(job, "running", progress=0.0)

        last = 0.0

        async def on_progress(p: float) -> None:
            nonlocal last
            now = time.monotonic()
            if p >= 1.0 or now - last >= PROGRESS_MIN_INTERVAL_S:
                last = now
                await self.emit(job, "running", progress=round(p, 3))

        gpu_seconds = 0.0
        try:
            async with self.gpu.hold():
                if self.s.unload_llm and self.s.ollama_base_url:
                    await unload_llms(self.s.ollama_base_url, self._http)
                started = time.monotonic()
                try:
                    files = await self.runner.run(job, on_progress)
                finally:
                    gpu_seconds = time.monotonic() - started
            outputs = await self._store(job, files)
            result = JobResult(
                job_id=job.job_id,
                status="completed",
                outputs=outputs,
                gpu_seconds=round(gpu_seconds, 2),
            )
        except ComfyError as e:
            result = self._failed(
                job, e.code, e.message, gpu_seconds, retryable=e.code == "connection_lost"
            )
        except TimeoutError:
            result = self._failed(
                job, "timeout", "The generation took too long.", gpu_seconds, retryable=True
            )
        except _TRANSIENT as e:
            if attempt < self.s.max_attempts:
                raise RetryJob(attempt, f"{type(e).__name__}: {e}") from e
            log.error("job %s: backend unavailable after %d attempts", job.job_id, attempt)
            result = self._failed(
                job,
                "backend_unavailable",
                "The generation backend is unavailable.",
                gpu_seconds,
                retryable=True,
            )
        except Exception:
            log.exception("job %s failed unexpectedly", job.job_id)
            result = self._failed(
                job, "job_failed", "The generation failed.", gpu_seconds, retryable=True
            )

        await self._record_usage(job, result)
        await self.state.finish(job.tenant_id, job.job_id, result)
        await self.emit(job, result.status, progress=1.0 if result.status == "completed" else None)
        return result

    def _failed(
        self, job: JobRequest, code: str, message: str, gpu_seconds: float, retryable: bool
    ) -> JobResult:
        log.warning("job %s failed: %s", job.job_id, code)
        return JobResult(
            job_id=job.job_id,
            status="failed",
            error=JobError(code=code, message=message, retryable=retryable),
            gpu_seconds=round(gpu_seconds, 2),
        )

    async def _store(self, job: JobRequest, files: Files) -> dict[str, JobOutput]:
        """Outputs go under the owner's prefix; the result carries keys relative to it, which is
        what `caps.storage` expects."""
        out: dict[str, JobOutput] = {}
        for name, (data, ctype, ext) in files.items():
            rel = f"jobs/{job.job_id}/{name}.{ext}"
            await self.storage.put(
                object_key(job.tenant_id, job.product_id, job.user_id, rel), data, ctype
            )
            out[name] = JobOutput(key=rel, content_type=ctype, size=len(data))
        return out

    async def _record_usage(self, job: JobRequest, result: JobResult) -> None:
        def event(kind: str, quantity: float, unit: str) -> UsageEvent:
            return UsageEvent(
                tenant_id=job.tenant_id,
                product_id=job.product_id,
                user_id=job.user_id,
                run_id=job.run_id,
                kind=kind,
                quantity=quantity,
                unit=unit,
                meta={"capability": job.capability, "workflow": job.workflow, "job_id": job.job_id},
            )

        if result.gpu_seconds:
            await record_safely(self.usage, event(GPU_SECONDS, result.gpu_seconds, "seconds"))
        if result.status == "completed":
            await record_safely(self.usage, event(JOB_COMPLETED, 1, "jobs"))
