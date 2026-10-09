"""wd-lipsync-ai: a character picture and a voice become a talking or singing clip (ADR-0044)."""

from wd_platform_sdk import GraphRegistry


def register(registry: GraphRegistry) -> None:
    from wd_lipsync_ai.canary import picture_check, words_check
    from wd_lipsync_ai.graphs.lipsync import build_lipsync
    from wd_lipsync_ai.index import LipSyncIndexSource
    from wd_lipsync_ai.routes import build_routes

    registry.register("wd-lipsync-ai", build_lipsync)
    registry.add_routes("wd-lipsync-ai", build_routes)
    registry.add_index_source("wd-lipsync-ai", LipSyncIndexSource)  # searchable in My creations
    # whatever models serve the guardrails must pass these first (ADR-0025)
    registry.add_check("wd-lipsync-ai", "text.moderate", words_check)
    registry.add_check("wd-lipsync-ai", "text.moderate_image", picture_check)
