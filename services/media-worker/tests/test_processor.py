import asyncio

import httpx
import pytest
from wd_media_worker.comfy import ComfyClient
from wd_media_worker.gpu import LocalGpuLock, unload_llms
from wd_media_worker.processor import ComfyRunner, JobProcessor, RetryJob, StubRunner
from wd_media_worker.settings import WorkerSettings
from wd_media_worker.state import InMemoryJobState
from wd_platform_sdk import (
    InMemoryEventLog,
    InMemoryUsageRecorder,
    JobRequest,
    memory_storage,
    object_key,
)

RUN, THREAD = "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"


GRAPH = {
    "8": {"class_type": "KSampler", "inputs": {}},
    "10": {"class_type": "SaveImage", "inputs": {}},
}


def job(graph=None, **kw) -> JobRequest:
    return JobRequest(
        tenant_id="t1",
        product_id="p1",
        user_id="u1",
        run_id=RUN,
        thread_id=THREAD,
        capability="image.generate",
        workflow="demo",
        prompt=graph or GRAPH,
        outputs={"image": {"node": "10", "type": "image"}},
        **kw,
    )


class Rig:
    def __init__(self, runner, settings=None, http=None):
        self.log, self.storage, self.usage = (
            InMemoryEventLog(),
            memory_storage(),
            InMemoryUsageRecorder(),
        )
        self.state = InMemoryJobState()
        self.p = JobProcessor(
            settings or WorkerSettings(max_attempts=2, ollama_base_url=""),
            self.log, self.storage, self.usage, runner, LocalGpuLock(), self.state, http,
        )  # fmt: skip

    async def events(self):
        return await self.log.read("t1", RUN, 0, 1)


@pytest.fixture
def comfy_rig(comfy):
    base, fake = comfy
    client = ComfyClient(base)
    return Rig(ComfyRunner(client, 10)), fake


async def test_completed_job_stores_output_reports_progress_and_usage(comfy_rig):
    rig, fake = comfy_rig
    result = await rig.p.process(job())

    assert result.status == "completed" and result.gpu_seconds > 0
    out = result.outputs["image"]
    assert (
        out.key.startswith("jobs/")
        and out.key.endswith("/image.png")
        and out.content_type == "image/png"
    )
    # stored under the owner's tenant/product/user prefix, and the result key is relative to it
    stored = object_key("t1", "p1", "u1", out.key)
    assert (await rig.storage.get(stored)).startswith(b"\x89PNG")
    assert fake.freed == 1  # ComfyUI was asked to release its models afterwards

    ev = await rig.events()
    statuses = [e["status"] for e in ev if e["event"] == "job_progress"]
    assert statuses[0] == "running" and statuses[-1] == "completed"
    progress = [e["progress"] for e in ev if e["status"] == "running"]
    assert progress[0] == 0.0 and progress == sorted(progress)  # never goes backwards
    assert ev[-1]["progress"] == 1.0 and [e["seq"] for e in ev] == list(range(1, len(ev) + 1))

    kinds = {e.kind: e for e in rig.usage.events}
    assert kinds["job.completed"].quantity == 1
    assert kinds["gpu.seconds"].quantity == result.gpu_seconds
    assert (kinds["job.completed"].tenant_id, kinds["job.completed"].user_id) == ("t1", "u1")


async def test_redelivered_job_is_not_run_again(comfy_rig):
    rig, fake = comfy_rig
    first = await rig.p.process(job(job_id="same"))
    n_events, n_submitted = len(await rig.events()), len(fake.submitted)
    again = await rig.p.process(job(job_id="same"))

    assert again == first
    assert len(fake.submitted) == n_submitted and len(await rig.events()) == n_events


async def test_failed_job_reports_a_generic_error_and_no_completion_usage(comfy):
    base, _ = comfy
    rig = Rig(ComfyRunner(ComfyClient(base), 10))
    result = await rig.p.process(
        job(
            {
                "1": {"class_type": "Boom", "inputs": {}},
                "10": {"class_type": "SaveImage", "inputs": {}},
            }
        )
    )

    assert result.status == "failed" and result.error.code == "execution_failed"  # type: ignore[union-attr]
    assert "CUDA" not in result.error.message  # type: ignore[union-attr]
    assert (await rig.events())[-1]["status"] == "failed"
    kinds = {e.kind for e in rig.usage.events}
    assert "job.completed" not in kinds and "gpu.seconds" in kinds  # the GPU time was still spent


async def test_timeout_is_a_retryable_failure(comfy):
    base, fake = comfy
    rig = Rig(ComfyRunner(ComfyClient(base), 0.3))
    result = await rig.p.process(job({"1": {"class_type": "Slow", "inputs": {}}}))
    assert (result.status, result.error.code, result.error.retryable) == ("failed", "timeout", True)  # type: ignore[union-attr]
    assert fake.interrupted == 1


class Unreachable:
    async def run(self, job, on_progress):
        raise httpx.ConnectError("connection refused")


async def test_unreachable_backend_retries_then_gives_up():
    rig = Rig(Unreachable())
    j = job()
    with pytest.raises(RetryJob) as e:
        await rig.p.process(j)  # attempt 1 of 2
    assert e.value.attempt == 1 and "ConnectError" in str(e.value)
    result = await rig.p.process(j)  # attempt 2 of 2: give up with a clean failure
    assert result.error.code == "backend_unavailable" and "refused" not in result.error.message  # type: ignore[union-attr]


async def test_stub_runner_makes_placeholder_files_without_a_gpu():
    rig = Rig(StubRunner())
    audio = job()
    audio.outputs = {
        "image": {"node": "1", "type": "image"},
        "audio": {"node": "2", "type": "audio"},
    }  # noqa: E702
    result = await rig.p.process(audio)
    assert result.status == "completed"
    assert (
        await rig.storage.get(object_key("t1", "p1", "u1", result.outputs["image"].key))
    ).startswith(b"\x89PNG")
    assert (
        await rig.storage.get(object_key("t1", "p1", "u1", result.outputs["audio"].key))
    ).startswith(b"RIFF")


async def test_one_job_at_a_time_on_a_gpu():
    active = peak = 0

    class Tracking:
        async def run(self, job, on_progress):
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            await asyncio.sleep(0.05)
            active -= 1
            return {"image": (b"x", "image/png", "png")}

    rig = Rig(Tracking())
    await asyncio.gather(*(rig.p.process(job(job_id=f"j{i}")) for i in range(4)))
    assert peak == 1


async def test_llms_are_unloaded_before_generation_starts():
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(f"{request.method} {request.url.path}")
        if request.url.path == "/api/ps":
            return httpx.Response(
                200, json={"models": [{"name": "gemma4:e4b"}, {"name": "nomic-embed-text:latest"}]}
            )
        assert request.method == "POST" and b'"keep_alive":0' in request.content.replace(b" ", b"")
        return httpx.Response(200, json={})

    class Recording:
        async def run(self, job, on_progress):
            calls.append("GENERATE")
            return {"image": (b"x", "image/png", "png")}

    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    rig = Rig(
        Recording(), WorkerSettings(ollama_base_url="http://ollama:11434", unload_llm=True), http
    )
    await rig.p.process(job())
    assert calls == ["GET /api/ps", "POST /api/generate", "POST /api/generate", "GENERATE"]


async def test_unload_is_best_effort_when_ollama_is_down():
    http = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda r: (_ for _ in ()).throw(httpx.ConnectError("down")))
    )
    assert await unload_llms("http://ollama:11434", http) == []  # logged, never raised
