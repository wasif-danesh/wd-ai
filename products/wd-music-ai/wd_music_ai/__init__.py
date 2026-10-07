"""wd-music-ai: turns a song idea into lyrics, a track and cover art."""

from wd_platform_sdk import GraphRegistry


def register(registry: GraphRegistry) -> None:
    from wd_music_ai.graphs.song import build_song

    registry.register("wd-music-ai", build_song)
