"""The upload endpoint (ADR-0035): a user's picture, checked, cleaned and stored under their prefix.

The request body is the image itself, read with a hard size cap while it streams: nothing is
trusted from the headers and nothing is buffered beyond the cap. The stored file is a re-encoded
PNG with no metadata, never the bytes the client sent."""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from wd_platform_sdk import (
    UPLOAD_CREATED,
    ScopedStorage,
    UploadError,
    UploadLimiter,
    UploadStore,
    UsageEvent,
    UsageRecorder,
    new_upload,
    process_image,
)
from wd_platform_sdk.usage import record_safely

from wd_api.identity import Identity, get_identity

log = logging.getLogger(__name__)
router = APIRouter(tags=["uploads"])
SWEEP_EVERY_S = 3600


class UploadResult(BaseModel):
    upload_id: str
    key: str  # relative to the user's prefix: what a run passes as `image_key`
    width: int
    height: int
    bytes: int


async def read_capped(request: Request, limit: int) -> bytes:
    """The request body, refused as soon as it passes `limit` bytes."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        raise UploadError(413, f"That file is too large. The limit is {limit // (1024 * 1024)} MB.")
    chunks, size = [], 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > limit:
            raise UploadError(
                413, f"That file is too large. The limit is {limit // (1024 * 1024)} MB."
            )
        chunks.append(chunk)
    if not size:
        raise UploadError(422, "No file was sent.")
    return b"".join(chunks)


@router.post("/products/{product_id}/uploads/images", response_model=UploadResult, status_code=201)
async def upload_image(
    product_id: str, request: Request, identity: Identity = Depends(get_identity)
) -> UploadResult:
    state: Any = request.app.state
    rule = state.upload_rules(product_id)
    if rule is None:
        raise HTTPException(404, "this product does not accept uploads")
    limiter: UploadLimiter = state.upload_limiter
    if not await limiter.allow(identity.tenant_id, identity.user_id):
        raise HTTPException(429, "Too many uploads. Please wait a while and try again.")
    try:
        data = await read_capped(request, rule.max_bytes)
        # decoding and re-encoding is CPU work: keep it off the event loop
        image = await asyncio.to_thread(process_image, data)
    except UploadError as exc:
        raise HTTPException(exc.status, exc.message) from None
    storage: ScopedStorage | None = state.storage
    if storage is None:
        raise HTTPException(503, "file storage is not available")
    record = new_upload(identity.tenant_id, product_id, identity.user_id, len(image.png))
    await storage.put_for(record.owner, record.key, image.png, "image/png")
    await state.uploads.add(record)
    recorder: UsageRecorder = state.usage
    await record_safely(
        recorder,
        UsageEvent(
            tenant_id=record.tenant_id, product_id=product_id, user_id=record.user_id,
            kind=UPLOAD_CREATED, quantity=record.bytes, unit="bytes", meta={"kind": "image"},
        ),
    )  # fmt: skip
    return UploadResult(
        upload_id=record.id,
        key=record.key,
        width=image.width,
        height=image.height,
        bytes=record.bytes,
    )


@router.delete("/products/{product_id}/uploads/images/{upload_id}", status_code=204)
async def delete_upload(
    product_id: str,
    upload_id: str,
    request: Request,
    identity: Identity = Depends(get_identity),
) -> None:
    """Remove the caller's own unused upload (the user took the picture back, ADR-0039)."""
    state: Any = request.app.state
    try:
        key = f"uploads/{UUID(upload_id)}.png"
    except ValueError:
        raise HTTPException(404, "upload not found") from None
    store: UploadStore = state.uploads
    record = await store.find(identity.tenant_id, product_id, identity.user_id, key)
    if record is None:  # also what someone else's upload looks like: no hint that it exists
        raise HTTPException(404, "upload not found")
    storage: ScopedStorage | None = state.storage
    if storage is None:
        raise HTTPException(503, "file storage is not available")
    try:
        await storage.delete_for(record.owner, record.key)
    except FileNotFoundError:
        pass
    await store.consume(record)


async def sweep_uploads(
    store: UploadStore, storage: ScopedStorage, now: datetime | None = None
) -> int:
    """Delete uploads nobody used within 24 hours (the file, then the row). Returns how many."""
    removed = 0
    for upload in await store.expired(now or datetime.now(UTC)):
        try:
            await storage.delete_for(upload.owner, upload.key)
        except FileNotFoundError:
            pass  # already gone: still forget the row
        await store.consume(upload)
        removed += 1
    return removed


async def sweep_forever(store: UploadStore, storage: ScopedStorage) -> None:
    while True:
        try:
            if removed := await sweep_uploads(store, storage):
                log.info("removed %d unused upload(s)", removed)
        except Exception:
            log.exception("the unused-upload clean-up failed; it will try again")
        await asyncio.sleep(SWEEP_EVERY_S)
