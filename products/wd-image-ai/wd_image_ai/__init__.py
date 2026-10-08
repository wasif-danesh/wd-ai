"""wd-image-ai: text to image and image to image (ADR-0036)."""

from wd_platform_sdk import GraphRegistry


def register(registry: GraphRegistry) -> None:
    from wd_image_ai.canary import moderation_check, picture_check
    from wd_image_ai.graphs.image import build_image
    from wd_image_ai.routes import build_routes

    registry.register("wd-image-ai", build_image)
    registry.add_routes("wd-image-ai", build_routes)
    # whatever models serve the guardrail must pass these first (ADR-0025)
    registry.add_check("wd-image-ai", "text.moderate", moderation_check)
    registry.add_check("wd-image-ai", "text.moderate_image", picture_check)
