from datetime import UTC, datetime, timedelta

import pytest
from fastapi import FastAPI, Header
from fastapi.testclient import TestClient
from wd_music_ai.routes import build_routes
from wd_music_ai.songs import InMemorySongStore, SongRecord
from wd_platform_sdk import Identity, RouteDeps, ScopedStorage, memory_storage

T0 = datetime(2026, 10, 8, 12, 0, tzinfo=UTC)


def identity(x_user: str = Header("u1"), x_tenant: str = Header("t1")) -> Identity:
    return Identity(tenant_id=x_tenant, user_id=x_user)


def song(n: int, user="u1", tenant="t1", cover=True) -> SongRecord:
    return SongRecord(
        id=f"00000000-0000-0000-0000-{n:012d}", tenant_id=tenant, product_id="wd-music-ai",
        user_id=user,
        thread_id=None, run_id=None, title=f"Song {n}", lyrics=f"[verse]\nlyrics {n}", style="pop",
        audio_key=f"s{n}/audio.mp3", cover_key=f"s{n}/cover.png" if cover else None,
        created_at=T0 + timedelta(minutes=n),
    )  # fmt: skip


@pytest.fixture
def client():
    store = InMemorySongStore()
    store.songs = [
        song(1), song(2, cover=False), song(3), song(4),
        song(5, user="someone-else"), song(6, tenant="other-tenant"),
    ]  # fmt: skip
    app = FastAPI()
    app.state.storage = ScopedStorage(memory_storage())
    app.include_router(
        build_routes(RouteDeps(app.state, identity), store), prefix="/products/wd-music-ai"
    )
    return TestClient(app)


def test_lists_only_my_songs_newest_first_with_fresh_links(client):
    page = client.get("/products/wd-music-ai/songs").json()
    assert [s["title"] for s in page["songs"]] == ["Song 4", "Song 3", "Song 2", "Song 1"]
    first = page["songs"][0]
    assert first["audio_url"].endswith(
        "t1/wd-music-ai/u1/s4/audio.mp3"
    )  # signed for this user's prefix
    assert first["cover_url"].endswith("s4/cover.png") and "lyrics" not in first
    assert page["songs"][2]["cover_url"] is None  # the cover job failed for song 2
    assert page["next_before"] is None


def test_pagination_walks_the_whole_list_once(client):
    seen, before = [], None
    for _ in range(5):
        params = {"limit": 3, **({"before": before} if before else {})}
        page = client.get("/products/wd-music-ai/songs", params=params).json()
        seen += [s["title"] for s in page["songs"]]
        before = page["next_before"]
        if before is None:
            break
    assert seen == ["Song 4", "Song 3", "Song 2", "Song 1"]


@pytest.mark.parametrize("limit", [0, 51, "x"])
def test_limit_is_validated(client, limit):
    assert client.get("/products/wd-music-ai/songs", params={"limit": limit}).status_code == 422


def test_detail_includes_the_lyrics(client):
    s = client.get("/products/wd-music-ai/songs/00000000-0000-0000-0000-000000000003").json()
    assert s["lyrics"] == "[verse]\nlyrics 3" and s["audio_url"] and s["title"] == "Song 3"


@pytest.mark.parametrize(
    "song_id",
    [
        "00000000-0000-0000-0000-000000000005",
        "00000000-0000-0000-0000-000000000006",
        "nope",
        "../x",
    ],
)
def test_other_users_other_tenants_and_junk_ids_are_all_just_404(client, song_id):
    # someone else's song, another tenant's song, and nonsense look identical: no existence leak
    assert client.get(f"/products/wd-music-ai/songs/{song_id}").status_code == 404


def test_each_user_sees_only_their_own(client):
    other = client.get("/products/wd-music-ai/songs", headers={"x-user": "someone-else"}).json()
    assert [s["title"] for s in other["songs"]] == ["Song 5"]
