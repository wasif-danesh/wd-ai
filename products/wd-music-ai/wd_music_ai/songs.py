"""Song storage and the daily quota."""

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
from wd_platform_sdk import RunContext, start_of_day_utc, sum_usage

SONG_CREATED = "song.created"


@dataclass(frozen=True)
class SongRecord:
    id: str
    tenant_id: str
    product_id: str
    user_id: str
    thread_id: str | None
    run_id: str | None
    title: str
    lyrics: str
    style: str
    audio_key: str  # relative to the user's storage prefix
    cover_key: str | None


class SongStore(Protocol):
    async def add(self, song: SongRecord) -> None: ...


class PostgresSongStore:
    def __init__(self, engine: AsyncEngine):
        self._engine = engine

    async def add(self, song: SongRecord) -> None:
        async with self._engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    INSERT INTO songs (id, tenant_id, product_id, user_id, thread_id, run_id,
                                       title, lyrics, style, audio_key, cover_key)
                    VALUES (:id, :tenant_id, :product_id, :user_id, :thread_id, :run_id,
                            :title, :lyrics, :style, :audio_key, :cover_key)
                    """
                ),
                {**song.__dict__, "id": UUID(song.id)},
            )


class InMemorySongStore:
    def __init__(self) -> None:
        self.songs: list[SongRecord] = []

    async def add(self, song: SongRecord) -> None:
        self.songs.append(song)


class Quota(Protocol):
    async def used_today(self, ctx: RunContext) -> int: ...


class UsageQuota:
    """Songs created today (UTC), counted from the `song.created` usage events."""

    def __init__(self, engine: AsyncEngine):
        self._engine = engine

    async def used_today(self, ctx: RunContext) -> int:
        return int(
            await sum_usage(
                self._engine,
                ctx.tenant_id,
                ctx.product_id,
                ctx.user_id,
                SONG_CREATED,
                start_of_day_utc(),
            )
        )


class FixedQuota:
    """For tests: pretend the user already made `used` songs today."""

    def __init__(self, used: int = 0) -> None:
        self.used = used

    async def used_today(self, ctx: RunContext) -> int:
        return self.used
