"""Capability interfaces. Graphs ask for capabilities, never models (ADR-0010)."""

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Protocol


class TextProvider(Protocol):
    def stream(self, capability: str, system: str, prompt: str) -> AsyncIterator[str]:
        """Stream text deltas for a named text capability (e.g. ``chat``)."""
        ...


@dataclass
class Capabilities:
    text: TextProvider


class FakeTextProvider:
    """Deterministic provider for tests: no GPU, no network."""

    def __init__(self, reply: str = "Hello from the fake provider."):
        self.reply = reply

    async def stream(self, capability: str, system: str, prompt: str) -> AsyncIterator[str]:
        for word in self.reply.split(" "):
            yield word + " "
