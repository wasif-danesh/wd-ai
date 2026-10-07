"""Text capability backed by LiteLLM's OpenAI-compatible API (ADR-0005)."""

from collections.abc import AsyncIterator

from openai import AsyncOpenAI


class LiteLLMTextProvider:
    def __init__(self, base_url: str, api_key: str, aliases: dict[str, str]):
        self._client = AsyncOpenAI(base_url=base_url, api_key=api_key or "none")
        self._aliases = aliases

    async def stream(self, capability: str, system: str, prompt: str) -> AsyncIterator[str]:
        stream = await self._client.chat.completions.create(
            model=self._aliases[capability],
            stream=True,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        )
        async for chunk in stream:
            if chunk.choices and (text := chunk.choices[0].delta.content):
                yield text
