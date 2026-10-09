"""wd-tts-ai: text to speech (ADR-0042)."""

from wd_platform_sdk import GraphRegistry


def register(registry: GraphRegistry) -> None:
    from wd_tts_ai.canary import moderation_check
    from wd_tts_ai.graphs.speech import build_speech
    from wd_tts_ai.index import SpeechIndexSource
    from wd_tts_ai.routes import build_routes

    registry.register("wd-tts-ai", build_speech)
    registry.add_routes("wd-tts-ai", build_routes)
    registry.add_index_source("wd-tts-ai", SpeechIndexSource)  # searchable in My creations
    # whatever model serves the moderator must pass the canary first (ADR-0025)
    registry.add_check("wd-tts-ai", "text.moderate", moderation_check)
