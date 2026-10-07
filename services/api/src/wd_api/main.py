import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.openapi.utils import get_openapi
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import TypeAdapter
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from wd_contracts import SseEvent
from wd_platform_sdk import (
    GraphRegistry,
    InMemoryJobSink,
    ProviderDeps,
    ScopedStorage,
    UsageRecorder,
    build_capabilities,
    load_product_config,
    s3_storage,
)

from wd_api.config import get_settings
from wd_api.graphs import default_registry
from wd_api.logging import configure_logging, request_id
from wd_api.rag import DIMENSIONS, RagService
from wd_api.routes import HEARTBEAT_S, router
from wd_api.runs import RunManager
from wd_api.usage_postgres import PostgresUsageRecorder


def create_app(
    registry: GraphRegistry | None = None,
    products_dir: Path | None = None,
    checkpointer: Any = None,
    usage: UsageRecorder | None = None,
    storage: ScopedStorage | None = None,
    engine: AsyncEngine | None = None,
    heartbeat_s: float = HEARTBEAT_S,
) -> FastAPI:
    """App factory. Tests inject a registry, products dir (with `provider: fake` bindings),
    checkpointer and usage recorder, so no GPU, network or database is needed."""
    settings = get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        reg = registry or default_registry()
        pdir = products_dir or Path(settings.products_dir)
        db = engine or create_async_engine(settings.database_url)
        recorder = usage or PostgresUsageRecorder(db)
        store = storage
        if store is None and settings.storage_access_key:
            store = ScopedStorage(
                s3_storage(
                    bucket=settings.storage_bucket,
                    endpoint=settings.storage_endpoint,
                    access_key=settings.storage_access_key,
                    secret_key=settings.storage_secret_key,
                    region=settings.storage_region,
                    public_endpoint=settings.storage_public_endpoint,
                )
            )
        deps = ProviderDeps(
            products_dir=pdir,
            usage=recorder,
            job_sink=InMemoryJobSink(),  # Redis-backed sink arrives with the media worker (Phase 4)
            litellm_base_url=settings.litellm_base_url,
            litellm_api_key=settings.litellm_api_key,
            storage=store,
            embedding_dims=DIMENSIONS,
        )

        def build_graphs(saver: Any) -> dict[str, Any]:
            graphs = {}
            for product_id in reg.products():
                # Fails at startup, with every problem listed, if the product config is bad.
                config = load_product_config(pdir, product_id, env=settings.product_env)
                caps = build_capabilities(config, deps)
                if "text.embed" in config.capabilities:
                    caps.rag = RagService(db, lambda texts, c=caps: c.text.embed("embed", texts))
                graphs[product_id] = reg.build(product_id, caps, saver)
            return graphs

        app.state.registry = reg
        app.state.runs = RunManager()
        app.state.heartbeat_s = heartbeat_s
        try:
            if checkpointer is not None:
                app.state.graphs = build_graphs(checkpointer)
                yield
            else:
                async with AsyncPostgresSaver.from_conn_string(settings.checkpoint_url) as saver:
                    await saver.setup()
                    app.state.graphs = build_graphs(saver)
                    yield
        finally:
            if engine is None:
                await db.dispose()

    app = FastAPI(title="wd-ai API", lifespan=lifespan)

    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        rid = request.headers.get("x-request-id", str(uuid.uuid4()))
        request_id.set(rid)
        response = await call_next(request)
        response.headers["x-request-id"] = rid
        return response

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(router)

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema
        schema = get_openapi(title=app.title, version="0.0.0", routes=app.routes)
        events = TypeAdapter(SseEvent).json_schema(ref_template="#/components/schemas/{model}")
        defs = events.pop("$defs", {})
        schemas = schema.setdefault("components", {}).setdefault("schemas", {})
        schemas.update(defs)
        schemas["SseEvent"] = events
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi  # type: ignore[method-assign]
    return app


app = create_app()
