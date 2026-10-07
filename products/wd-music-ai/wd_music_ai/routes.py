"""The product's read API: a user's songs (ADR-0023). Mounted under /products/wd-music-ai/.

Every query is scoped by tenant, product and user, and every audio/cover link is signed fresh, so
a song can be opened any time (the links themselves expire after an hour)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from wd_platform_sdk import Identity, RouteDeps

from wd_music_ai.songs import PostgresSongStore, SongRecord, SongStore

PRODUCT_ID = "wd-music-ai"


class SongSummary(BaseModel):
    id: str
    title: str
    style: str
    created_at: datetime
    audio_url: str
    cover_url: str | None  # null when the cover job failed


class SongDetail(SongSummary):
    lyrics: str


class SongPage(BaseModel):
    songs: list[SongSummary]
    next_before: datetime | None  # pass as `before` to get the next page; null at the end


def build_routes(deps: RouteDeps, store: SongStore | None = None) -> APIRouter:
    """`store` is injectable for tests; production reads the shared database."""
    router = APIRouter(tags=[PRODUCT_ID])

    def songs() -> SongStore:
        return store or PostgresSongStore(deps.engine)

    async def summary(song: SongRecord) -> dict:
        assert deps.storage is not None, "object storage is not configured"
        return {
            "id": song.id,
            "title": song.title,
            "style": song.style,
            "created_at": song.created_at,
            "audio_url": await deps.storage.url(song.audio_key),
            "cover_url": await deps.storage.url(song.cover_key) if song.cover_key else None,
        }

    @router.get("/songs", response_model=SongPage)
    async def list_songs(
        limit: int = Query(20, ge=1, le=50),
        before: datetime | None = None,
        identity: Identity = Depends(deps.identity),
    ) -> SongPage:
        rows = await songs().list(identity.tenant_id, identity.user_id, limit + 1, before)
        page, more = rows[:limit], len(rows) > limit
        with deps.acting_as(identity, PRODUCT_ID):
            items = [SongSummary(**await summary(s)) for s in page]
        return SongPage(songs=items, next_before=page[-1].created_at if more and page else None)

    @router.get("/songs/{song_id}", response_model=SongDetail)
    async def get_song(song_id: str, identity: Identity = Depends(deps.identity)) -> SongDetail:
        song = await songs().get(identity.tenant_id, identity.user_id, song_id)
        if song is None:  # also what another user's song looks like: no existence leak
            raise HTTPException(404, "song not found")
        with deps.acting_as(identity, PRODUCT_ID):
            return SongDetail(**await summary(song), lyrics=song.lyrics)

    return router
