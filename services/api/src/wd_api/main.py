import uuid

from fastapi import FastAPI, Request

from wd_api.config import get_settings
from wd_api.logging import configure_logging, request_id

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="wd-ai API")


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
