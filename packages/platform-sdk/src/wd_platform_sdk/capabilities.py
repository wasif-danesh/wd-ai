"""Capability interfaces. Graphs ask for capabilities, never models (ADR-0010, rule 4).

async for delta in caps.text.stream("lyrics", system, prompt): ...
handle = await caps.music.generate(lyrics=..., style=..., duration_s=60)
key = await caps.storage.put("songs/42/audio.mp3", data)
"""

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Protocol

from wd_platform_sdk.config import CapabilityBinding
from wd_platform_sdk.jobs import JobHandle
from wd_platform_sdk.storage import ScopedStorage


class CapabilityNotConfigured(LookupError):
    pass


class TextProvider(Protocol):
    def stream(
        self, capability: str, binding: CapabilityBinding, system: str, prompt: str
    ) -> AsyncIterator[str]: ...

    async def embed(
        self, capability: str, binding: CapabilityBinding, texts: list[str]
    ) -> list[list[float]]: ...


class MediaProvider(Protocol):
    async def generate(
        self, capability: str, binding: CapabilityBinding, inputs: dict[str, Any]
    ) -> JobHandle: ...


class RagStore(Protocol):
    async def ingest(
        self, collection: str, document_id: str, content: str, metadata: dict[str, Any] | None = ...
    ) -> int: ...

    async def search(self, collection: str, query: str, k: int = ...) -> list[Any]: ...


class TextCapabilities:
    def __init__(self, bound: dict[str, tuple[CapabilityBinding, TextProvider]], product: str = ""):
        self._bound = bound  # "chat" -> (binding for "text.chat", provider)
        self._product = product

    def _get(self, name: str) -> tuple[CapabilityBinding, TextProvider]:
        try:
            return self._bound[name]
        except KeyError:
            raise CapabilityNotConfigured(
                f"capability 'text.{name}' is not configured for product {self._product!r}"
            ) from None

    def stream(self, name: str, system: str, prompt: str) -> AsyncIterator[str]:
        binding, provider = self._get(name)
        return provider.stream(f"text.{name}", binding, system, prompt)

    async def complete(self, name: str, system: str, prompt: str) -> str:
        return "".join([d async for d in self.stream(name, system, prompt)])

    async def embed(self, name: str, texts: list[str]) -> list[list[float]]:
        binding, provider = self._get(name)
        return await provider.embed(f"text.{name}", binding, texts)


class MediaCapabilities:
    """`caps.image` / `caps.music` / `caps.video`: generate() enqueues a job, returns a handle."""

    def __init__(
        self,
        family: str,
        bound: dict[str, tuple[CapabilityBinding, MediaProvider]],
        product: str = "",
    ):
        self._family = family
        self._bound = bound
        self._product = product

    async def generate(self, **inputs: Any) -> JobHandle:
        name = f"{self._family}.generate"
        try:
            binding, provider = self._bound["generate"]
        except KeyError:
            raise CapabilityNotConfigured(
                f"capability {name!r} is not configured for product {self._product!r}"
            ) from None
        return await provider.generate(name, binding, inputs)


@dataclass
class Capabilities:
    text: TextCapabilities
    image: MediaCapabilities
    music: MediaCapabilities
    video: MediaCapabilities
    storage: ScopedStorage | None = None
    rag: RagStore | None = None
    extras: dict[str, Any] = field(default_factory=dict)
