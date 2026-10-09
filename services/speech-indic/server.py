"""A small OpenAI-style speech server for Indic Parler-TTS (ADR-0042).

Speaches cannot serve this model, so this adapter loads it once and answers `POST /v1/audio/speech`
the way the media worker expects: the text in `input`, a description of the speaker (or a named
speaker such as "Aditi's voice ...") in `voice`, and a WAV back. The model is gated: its weights are
downloaded on first use with the `HF_TOKEN` secret, never baked into the image."""

import io
import logging
import os
import threading
import time
import wave

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from transformers import AutoTokenizer

MODEL_ID = os.environ.get("INDIC_PARLER_MODEL", "ai4bharat/indic-parler-tts")
# float32 is about 5 times faster than bfloat16 on a CPU (measured: 30 s against 120 s for 5 s of
# speech) but needs about 4.5 GB; set INDIC_DTYPE=bfloat16 to halve the memory at that cost
DTYPE = getattr(torch, os.environ.get("INDIC_DTYPE", "float32"))
log = logging.getLogger("speech-indic")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())

app = FastAPI(title="speech-indic")
_lock = threading.Lock()  # one generation at a time: the model is big and the CPU is shared
_state: dict = {}


class SpeechRequest(BaseModel):
    model: str = MODEL_ID
    input: str = Field(min_length=1, max_length=1000)
    voice: str = Field(min_length=1, max_length=600)  # the speaker description
    response_format: str = "wav"


def _load() -> dict:
    """Load the model on first use (about 4 GB the first time, then from the volume)."""
    if _state:
        return _state
    from parler_tts import ParlerTTSForConditionalGeneration

    token = os.environ.get("HF_TOKEN") or None
    started = time.monotonic()
    model = ParlerTTSForConditionalGeneration.from_pretrained(
        MODEL_ID, token=token, torch_dtype=DTYPE
    ).eval()
    prompt_tok = AutoTokenizer.from_pretrained(MODEL_ID, token=token)
    desc_tok = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    _state.update(model=model, prompt_tok=prompt_tok, desc_tok=desc_tok)
    log.info("model loaded in %.1fs", time.monotonic() - started)
    return _state


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "loaded": bool(_state)}


@app.post("/v1/audio/speech")
def speech(req: SpeechRequest) -> Response:
    if req.response_format != "wav":
        raise HTTPException(400, "Only wav is supported.")
    with _lock:
        try:
            s = _load()
        except Exception as exc:  # noqa: BLE001 - a missing token or terms shows as a 5xx, not a trace
            log.error("could not load the model: %s: %.300s", type(exc).__name__, exc)
            raise HTTPException(503, "The Indic speech model is not available.") from exc
        started = time.monotonic()
        desc = s["desc_tok"](req.voice, return_tensors="pt")
        prompt = s["prompt_tok"](req.input, return_tensors="pt")
        with torch.inference_mode():
            out = s["model"].generate(
                input_ids=desc.input_ids,
                attention_mask=desc.attention_mask,
                prompt_input_ids=prompt.input_ids,
                prompt_attention_mask=prompt.attention_mask,
            )
        audio = out.float().cpu().numpy().squeeze()
        rate = int(s["model"].config.sampling_rate)
        log.info("made %.1fs of audio in %.1fs", len(audio) / rate, time.monotonic() - started)
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    return Response(buf.getvalue(), media_type="audio/wav")
