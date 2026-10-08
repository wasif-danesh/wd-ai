import asyncio
import logging
import signal

import httpx
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import create_async_engine
from wd_platform_sdk import (
    InMemoryUsageRecorder,
    PostgresMediaBindingStore,
    PostgresUsageRecorder,
    RedisEventLog,
    SecretBox,
    UsageRecorder,
    memory_storage,
    s3_storage,
)

from wd_media_worker.backends import BackendRouter
from wd_media_worker.comfy import ComfyClient
from wd_media_worker.consumer import Worker
from wd_media_worker.gpu import RedisGpuLock
from wd_media_worker.processor import ComfyRunner, JobProcessor, StubRunner
from wd_media_worker.settings import WorkerSettings
from wd_media_worker.state import RedisJobState

# redis-py defaults to 5 s; blocking queue reads must not hit that.
REDIS_SOCKET_TIMEOUT_S = 60


async def main() -> None:
    s = WorkerSettings()
    logging.basicConfig(level=s.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    log = logging.getLogger("wd_media_worker")

    redis = Redis.from_url(
        s.redis_url, decode_responses=True, socket_timeout=REDIS_SOCKET_TIMEOUT_S
    )
    if s.storage_access_key:
        storage = s3_storage(
            bucket=s.storage_bucket,
            endpoint=s.storage_endpoint,
            access_key=s.storage_access_key,
            secret_key=s.storage_secret_key,
            region=s.storage_region,
        )
    else:
        log.warning("STORAGE_ACCESS_KEY is unset: outputs go to memory and are lost")
        storage = memory_storage()

    engine = create_async_engine(s.database_url) if s.database_url else None
    usage: UsageRecorder = PostgresUsageRecorder(engine) if engine else InMemoryUsageRecorder()
    if engine is None:
        log.warning("DATABASE_URL is unset: usage events are not persisted")

    comfy = ComfyClient(s.comfyui_base_url)
    if s.comfyui_mode == "stub":
        log.warning("COMFYUI_MODE=stub: producing placeholder files, no GPU work")
        runner = StubRunner()
    else:
        runner = ComfyRunner(comfy, s.job_timeout_s)

    http = httpx.AsyncClient(timeout=30)
    # The admin chooses the backend per product capability (ADR-0025); `runner` is the default.
    router = BackendRouter(
        runner,
        s,
        PostgresMediaBindingStore(engine) if engine else None,
        SecretBox(s.media_secrets_key),
        http,
    )
    processor = JobProcessor(
        s,
        RedisEventLog(redis),
        storage,
        usage,
        router,
        RedisGpuLock(redis, s.gpu_id),
        RedisJobState(redis),
        http,
    )
    worker = Worker(redis, processor)

    task = asyncio.create_task(worker.run_forever())
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, task.cancel)
    try:
        await task
    except asyncio.CancelledError:
        log.info("worker stopping")
    finally:
        await comfy.aclose()
        await router.aclose()
        await http.aclose()
        await redis.aclose()
        if engine:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
