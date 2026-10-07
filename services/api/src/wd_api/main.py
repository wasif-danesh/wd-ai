import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.openapi.utils import get_openapi
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import TypeAdapter
from wd_contracts import SseEvent
from wd_platform_sdk import Capabilities, GraphRegistry

from wd_api.config import get_settings
from wd_api.graphs import default_registry
from wd_api.litellm_provider import LiteLLMTextProvider
from wd_api.logging import configure_logging, request_id
from wd_api.routes import HEARTBEAT_S, router
from wd_api.runs import RunManager

# Capability name -> LiteLLM alias. Real bindings move to product.yaml in Phase 3.
TEXT_ALIASES = {"chat": "default-chat"}


def create_app(
    registry: GraphRegistry | None = None,
    caps: Capabilities | None = None,
    checkpointer: Any = None,
    heartbeat_s: float = HEARTBEAT_S,
) -> FastAPI:
    """App factory. Tests inject a fake registry/capabilities/checkpointer."""
    settings = get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.registry = registry or default_registry()
        app.state.runs = RunManager()
        app.state.heartbeat_s = heartbeat_s
        provider = caps or Capabilities(
            text=LiteLLMTextProvider(
                settings.litellm_base_url, settings.litellm_api_key, TEXT_ALIASES
            )
        )
        if checkpointer is not None:
            app.state.graphs = {
                p: app.state.registry.build(p, provider, checkpointer)
                for p in app.state.registry.products()
            }
            yield
            return
        async with AsyncPostgresSaver.from_conn_string(settings.checkpoint_url) as saver:
            await saver.setup()
            app.state.graphs = {
                p: app.state.registry.build(p, provider, saver)
                for p in app.state.registry.products()
            }
            yield

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
