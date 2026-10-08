"""wd-video-ai: text to video and image to video (ADR-0037)."""

from wd_platform_sdk import GraphRegistry


def register(registry: GraphRegistry) -> None:
    from wd_video_ai.canary import moderation_check, picture_check
    from wd_video_ai.graphs.video import build_video
    from wd_video_ai.index import VideoIndexSource
    from wd_video_ai.routes import build_routes

    registry.register("wd-video-ai", build_video)
    registry.add_routes("wd-video-ai", build_routes)
    registry.add_index_source("wd-video-ai", VideoIndexSource)  # searchable in My creations
    # whatever models serve the guardrail must pass these first (ADR-0025)
    registry.add_check("wd-video-ai", "text.moderate", moderation_check)
    registry.add_check("wd-video-ai", "text.moderate_image", picture_check)
