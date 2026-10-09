"""A small OpenAI-style transcription server for IndicConformer (ADR-0043).

Speaches cannot serve this model, so this adapter loads it once and answers
`POST /v1/audio/transcriptions` the way the media worker expects: a short WAV in `file`, the
language in `language` (it does not detect one), the text back. The model (ai4bharat, MIT licence,
22 Indian languages) is gated: its files are downloaded at first start with the `HF_TOKEN` secret,
never baked into the image, at one pinned revision.

Only the CTC decoder is used, and the model code is not downloaded or run: the few lines that load
the ONNX parts and decode are here, so nothing but model files comes from the Hub. The worker cuts a
long recording into pieces of up to about 15 seconds; this server takes one piece at a time."""

import io
import json
import logging
import os
import threading
import time
import wave
from typing import Annotated

import numpy as np
import onnxruntime as ort
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from huggingface_hub import snapshot_download

REPO = "ai4bharat/indic-conformer-600m-multilingual"
# pinned: a new upload to the model repository changes nothing here until this is changed on purpose
REVISION = os.environ.get("INDIC_STT_REVISION", "2a77d305038dfc502fd9464e7d028b90381976cb")
BLANK = 256
MAX_SECONDS = 40  # the worker sends pieces of about 15 s; this refuses anything that is not a piece
RATE = 16000

log = logging.getLogger("stt-indic")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())

app = FastAPI(title="stt-indic")
_lock = threading.Lock()  # one piece at a time: the model is big and the CPU is shared
_state: dict = {}


def _load() -> dict:
    """Load the model on first use (about 2.5 GB the first time, then from the volume)."""
    if _state:
        return _state
    started = time.monotonic()
    folder = snapshot_download(REPO, revision=REVISION, token=os.environ.get("HF_TOKEN") or None)
    cpu = ["CPUExecutionProvider"]
    _state.update(
        pre=torch.jit.load(f"{folder}/assets/preprocessor.ts", map_location="cpu"),
        encoder=ort.InferenceSession(f"{folder}/assets/encoder.onnx", providers=cpu),
        ctc=ort.InferenceSession(f"{folder}/assets/ctc_decoder.onnx", providers=cpu),
        vocab=json.load(open(f"{folder}/assets/vocab.json", encoding="utf-8")),
        masks=json.load(open(f"{folder}/assets/language_masks.json", encoding="utf-8")),
    )
    log.info("model loaded in %.1fs", time.monotonic() - started)
    return _state


def _read_wav(data: bytes) -> np.ndarray:
    try:
        with wave.open(io.BytesIO(data)) as w:
            if (w.getnchannels(), w.getsampwidth(), w.getframerate()) != (1, 2, RATE):
                raise ValueError("expected 16 kHz mono 16-bit WAV")
            frames = w.readframes(w.getnframes())
    except (wave.Error, EOFError, ValueError):
        raise HTTPException(422, "The audio must be a 16 kHz mono 16-bit WAV.") from None
    return np.frombuffer(frames, dtype="<i2").astype("float32") / 32768.0


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "loaded": bool(_state)}


@app.get("/v1/languages")
def languages() -> dict:
    return {"languages": sorted(_load()["masks"])}


@app.post("/v1/audio/transcriptions")
def transcribe(
    file: Annotated[UploadFile, File()],
    language: Annotated[str, Form()],
    model: Annotated[str, Form()] = "",
    response_format: Annotated[str, Form()] = "json",
) -> dict:
    audio = _read_wav(file.file.read())
    if len(audio) / RATE > MAX_SECONDS:
        raise HTTPException(
            422, "That piece of audio is too long: send pieces of 30 seconds or less."
        )
    if len(audio) < RATE // 10:
        return {"text": "", "language": language}
    with _lock:
        try:
            s = _load()
        except Exception as exc:  # noqa: BLE001 - a missing token or terms shows as a 5xx, not a trace
            log.error("could not load the model: %s: %.300s", type(exc).__name__, exc)
            raise HTTPException(503, "The Indic speech model is not available.") from exc
        if language not in s["masks"]:
            raise HTTPException(422, f"Unsupported language: {language[:12]!r}.")
        started = time.monotonic()
        wav = torch.from_numpy(audio).unsqueeze(0)
        with torch.inference_mode():
            signal, length = s["pre"](input_signal=wav, length=torch.tensor([wav.shape[-1]]))
        encoded, _ = s["encoder"].run(
            ["outputs", "encoded_lengths"],
            {"audio_signal": signal.numpy(), "length": length.numpy()},
        )
        logprobs = s["ctc"].run(["logprobs"], {"encoder_output": encoded})[0]
        scores = torch.from_numpy(logprobs[:, :, s["masks"][language]]).log_softmax(dim=-1)
        picked = torch.unique_consecutive(torch.argmax(scores[0], dim=-1)).tolist()
        text = "".join(s["vocab"][language][i] for i in picked if i != BLANK)
        log.info("%.1fs of audio in %.2fs", len(audio) / RATE, time.monotonic() - started)
    return {"text": text.replace("▁", " ").strip(), "language": language}
