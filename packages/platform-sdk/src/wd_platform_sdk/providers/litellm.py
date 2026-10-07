"""Text capability over LiteLLM's OpenAI-compatible API (ADR-0005). Records token usage."""

from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from wd_platform_sdk.config import CapabilityBinding
from wd_platform_sdk.context import require_context
from wd_platform_sdk.usage import (
    EMBEDDING_TOKENS,
    LLM_INPUT_TOKENS,
    LLM_OUTPUT_TOKENS,
    UsageEvent,
    UsageRecorder,
    record_safely,
)


class LiteLLMTextProvider:
    def __init__(self, base_url: str, api_key: str, usage: UsageRecorder):
        self._client = AsyncOpenAI(base_url=base_url, api_key=api_key or "none")
        self._usage = usage

    async def stream(
        self, capability: str, binding: CapabilityBinding, system: str, prompt: str
    ) -> AsyncIterator[str]:
        ctx = require_context()
        in_tokens = out_tokens = 0
        try:
            stream = await self._client.chat.completions.create(
                model=binding.model or "",
                stream=True,
                stream_options={"include_usage": True},
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
            )
            async for chunk in stream:
                if chunk.usage:
                    in_tokens, out_tokens = chunk.usage.prompt_tokens, chunk.usage.completion_tokens
                if chunk.choices and (text := chunk.choices[0].delta.content):
                    yield text
        finally:
            meta = {"capability": capability, "alias": binding.model}
            if in_tokens:
                await record_safely(
                    self._usage,
                    UsageEvent.for_context(ctx, LLM_INPUT_TOKENS, in_tokens, "tokens", **meta),
                )
            if out_tokens:
                await record_safely(
                    self._usage,
                    UsageEvent.for_context(ctx, LLM_OUTPUT_TOKENS, out_tokens, "tokens", **meta),
                )

    async def embed(
        self, capability: str, binding: CapabilityBinding, texts: list[str]
    ) -> list[list[float]]:
        ctx = require_context()
        # float: the SDK default (base64) is not supported by Ollama behind LiteLLM
        resp = await self._client.embeddings.create(
            model=binding.model or "", input=texts, encoding_format="float"
        )
        if resp.usage and resp.usage.prompt_tokens:
            await record_safely(
                self._usage,
                UsageEvent.for_context(
                    ctx,
                    EMBEDDING_TOKENS,
                    resp.usage.prompt_tokens,
                    "tokens",
                    capability=capability,
                    alias=binding.model,
                ),
            )
        return [d.embedding for d in sorted(resp.data, key=lambda d: d.index)]
