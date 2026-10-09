"""wd-stt-ai: speech to text (ADR-0043)."""

from wd_platform_sdk import GraphRegistry


def register(registry: GraphRegistry) -> None:
    from wd_stt_ai.graphs.transcribe import build_transcribe
    from wd_stt_ai.index import TranscriptIndexSource
    from wd_stt_ai.routes import build_routes

    registry.register("wd-stt-ai", build_transcribe)
    registry.add_routes("wd-stt-ai", build_routes)
    registry.add_index_source("wd-stt-ai", TranscriptIndexSource)  # searchable in My creations
