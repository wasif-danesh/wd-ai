"""Stub runner (COMFYUI_MODE=stub): placeholder files and simulated progress, no GPU or models.
For UI work and laptops that cannot run the real models."""

import asyncio
import hashlib
import json
import math
import struct
import wave
import zlib
from io import BytesIO

from wd_media_worker.comfy import ProgressFn


def placeholder_png(seed: str, size: int = 256) -> bytes:
    """A deterministic gradient, so repeated jobs differ and are recognisable."""
    h = hashlib.sha256(seed.encode()).digest()
    r0, g0, b0 = h[0], h[1], h[2]
    rows = b"".join(
        b"\x00" + b"".join(bytes(((r0 + x) % 256, (g0 + y) % 256, b0)) for x in range(size))
        for y in range(size)
    )

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return (
            struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(rows))
        + chunk(b"IEND", b"")
    )


def placeholder_wav(seed: str, seconds: float = 2.0, rate: int = 16000) -> bytes:
    freq = 220 + hashlib.sha256(seed.encode()).digest()[0]
    frames = b"".join(
        struct.pack("<h", int(8000 * math.sin(2 * math.pi * freq * i / rate)))
        for i in range(int(seconds * rate))
    )
    buf = BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(frames)
    return buf.getvalue()


async def run_stub(
    job_id: str, outputs: dict[str, dict], on_progress: ProgressFn, steps: int = 5
) -> dict[str, tuple[bytes, str, str]]:
    """Returns {output name: (bytes, content type, extension)}."""
    for i in range(1, steps + 1):
        await asyncio.sleep(0.1)
        await on_progress(i / steps)
    made: dict[str, tuple[bytes, str, str]] = {}
    for name, spec in outputs.items():
        kind = spec.get("type", "image")
        if kind == "json":
            sample = {
                "text": "This is a placeholder transcript.",
                "language": "en",
                "segments": [
                    {"start": 0.0, "end": 2.0, "text": "This is a placeholder transcript."}
                ],
            }
            made[name] = (json.dumps(sample).encode(), "application/json", "json")
        elif kind == "audio":
            made[name] = (placeholder_wav(job_id), "audio/wav", "wav")
        else:
            made[name] = (placeholder_png(job_id), "image/png", "png")
    return made
