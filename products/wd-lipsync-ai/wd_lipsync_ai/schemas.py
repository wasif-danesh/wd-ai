"""The run's input contract and the structured output of the picture guardrail."""

from typing import Any, Literal

from pydantic import BaseModel

MAX_SCRIPT_CHARS = 300
MAX_STYLE_CHARS = 120
MAX_SECONDS = 15.0  # ADR-0044: the limit is for cost and is raised only from measured speed
FPS = 25
Source = Literal["script", "audio"]

CATEGORIES = [
    "ok",
    "sexual_content",
    "minors",
    "graphic_violence",
    "hate",
    "real_person_photo",
    "disallowed_content",
]


class PictureVerdict(BaseModel):
    allowed: bool
    category: Literal[
        "ok",
        "sexual_content",
        "minors",
        "graphic_violence",
        "hate",
        "real_person_photo",
        "disallowed_content",
    ]
    reason: str = ""


PICTURE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "allowed": {"type": "boolean"},
        "category": {"type": "string", "enum": CATEGORIES},
        "reason": {"type": "string"},
    },
    "required": ["allowed", "category", "reason"],
    "additionalProperties": False,
}
