# pyright: reportMissingImports=false
# (mlx_whisper, torch and transformers live in separate throwaway environments, not the project)
"""Measure speech to text before building it (ADR-0043).

Reads the clips and references fetched by `fetch_fleurs.py`, transcribes each one with a Whisper
model, and reports per language: the error rate against the reference (word error rate; character
error rate for Chinese and Japanese), how often the language was guessed right when none was given,
and the real-time factor (seconds of compute per second of audio).

Two engines: `speaches` (an OpenAI-compatible server with faster-whisper inside) and `mlx`
(mlx-whisper on Apple's GPU, run in a separate virtual environment because it is Mac-only).

    uv run python services/api/evals/transcribe/run_transcribe_eval.py CLIPS \
        --model deepdml/faster-whisper-large-v3-turbo-ct2
    mlxenv/bin/python services/api/evals/transcribe/run_transcribe_eval.py CLIPS \
        --engine mlx --model mlx-community/whisper-large-v3-turbo

The error rate is measured on read speech with a clean reference, so it is the best case: real
recordings (phone audio, background noise, two speakers) will be worse. FLEURS is CC-BY-4.0."""

import argparse
import json
import re
import statistics
import time
import unicodedata
from pathlib import Path

BASE = "http://localhost:8100"


def normalise(text: str, unit: str) -> list[str]:
    """Lowercase, no punctuation or symbols; words, or single characters without spaces."""
    text = unicodedata.normalize("NFKC", text).lower()
    text = "".join(c for c in text if not unicodedata.category(c).startswith(("P", "S")))
    return list(re.sub(r"\s+", "", text)) if unit == "char" else text.split()


def edits(ref: list[str], hyp: list[str]) -> int:
    """Levenshtein distance between two token lists."""
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i]
        for j, h in enumerate(hyp, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h)))
        prev = cur
    return prev[-1]


def seconds_of(path: Path) -> float:
    """Length of a RIFF/WAVE file (PCM or float, which the `wave` module cannot read)."""
    raw = path.read_bytes()
    pos, rate, width = 12, 16000, 4
    while pos + 8 <= len(raw):
        tag, size = raw[pos : pos + 4], int.from_bytes(raw[pos + 4 : pos + 8], "little")
        if tag == b"fmt ":
            channels = int.from_bytes(raw[pos + 10 : pos + 12], "little")
            rate = int.from_bytes(raw[pos + 12 : pos + 16], "little")
            width = channels * int.from_bytes(raw[pos + 22 : pos + 24], "little") // 8
        elif tag == b"data":
            return min(size, len(raw) - pos - 8) / (rate * width)
        pos += 8 + size + (size & 1)
    raise ValueError(f"no audio in {path}")


def transcribe_speaches(path: Path, model: str, language: str | None) -> tuple[str, str]:
    import httpx

    data = {"model": model, "response_format": "verbose_json"}
    if language:
        data["language"] = language
    with path.open("rb") as f:
        r = httpx.post(
            f"{BASE}/v1/audio/transcriptions",
            data=data,
            files={"file": (path.name, f, "audio/wav")},
            timeout=1800,
        )
    r.raise_for_status()
    body = r.json()
    return body["text"], str(body.get("language", ""))


def transcribe_mlx(path: Path, model: str, language: str | None) -> tuple[str, str]:
    import mlx_whisper  # type: ignore[import-not-found]

    out = mlx_whisper.transcribe(str(path), path_or_hf_repo=model, language=language, verbose=None)
    return out["text"], str(out.get("language", ""))


_INDIC: dict = {}


def read_wav(path: Path):
    """16 kHz mono float samples of a FLEURS clip (32-bit float or 16-bit PCM WAV)."""
    import numpy as np

    raw = path.read_bytes()
    pos, fmt = 12, 1
    while pos + 8 <= len(raw):
        tag, size = raw[pos : pos + 4], int.from_bytes(raw[pos + 4 : pos + 8], "little")
        if tag == b"fmt ":
            fmt = int.from_bytes(raw[pos + 8 : pos + 10], "little")
        elif tag == b"data":
            body = raw[pos + 8 : pos + 8 + size]
            if fmt == 3:
                return np.frombuffer(body, dtype="<f4").copy()
            return np.frombuffer(body, dtype="<i2").astype("float32") / 32768.0
        pos += 8 + size + (size & 1)
    raise ValueError(f"no audio in {path}")


def transcribe_indic(path: Path, model: str, language: str | None) -> tuple[str, str]:
    """IndicConformer (ai4bharat, MIT): ONNX encoder, CTC or RNNT decoder; needs the language."""
    import torch
    from transformers import AutoModel

    if not language:
        raise SystemExit("the indic engine needs --hint (it does not detect the language)")
    if "model" not in _INDIC:
        _INDIC["model"] = AutoModel.from_pretrained(model, trust_remote_code=True)
    wav = torch.from_numpy(read_wav(path)).unsqueeze(0)
    text = _INDIC["model"](wav, language, _INDIC.get("decoding", "ctc"))
    return str(text), language


def short(code: str) -> str:
    return code.lower().split("-")[0].split("_")[0][:2] if len(code) <= 5 else code.lower()


def main(
    clips: Path,
    model: str,
    engine: str,
    hint: bool,
    only: set[str],
    limit: int,
    out: Path | None,
    decoding: str = "ctc",
) -> None:
    _INDIC["decoding"] = decoding
    manifest = [
        m
        for m in json.loads((clips / "manifest.json").read_text())
        if not only or m["code"] in only
    ]
    fn = {"mlx": transcribe_mlx, "indic": transcribe_indic}.get(engine, transcribe_speaches)
    # the first call loads the model; do it on one clip so the load is not counted in the speed
    warm = clips / manifest[0]["file"]
    fn(warm, model, manifest[0]["code"] if hint else None)
    rows = []
    per: dict[str, dict] = {}
    for m in manifest:
        n = sum(1 for r in rows if r["code"] == m["code"])
        if limit and n >= limit:
            continue
        path = clips / m["file"]
        audio = seconds_of(path)
        t0 = time.perf_counter()
        text, lang = fn(path, model, m["code"] if hint else None)
        took = time.perf_counter() - t0
        ref = normalise(m["reference"], m["unit"])
        hyp = normalise(text, m["unit"])
        e = edits(ref, hyp)
        rows.append(
            {
                "language": m["language"],
                "code": m["code"],
                "file": m["file"],
                "audio_s": round(audio, 2),
                "took_s": round(took, 2),
                "edits": e,
                "ref_len": len(ref),
                "detected": lang,
                "reference": m["reference"],
                "hypothesis": text,
            }
        )
        d = per.setdefault(
            m["code"],
            {
                "language": m["language"],
                "unit": m["unit"],
                "edits": 0,
                "ref": 0,
                "audio": 0.0,
                "took": 0.0,
                "hit": 0,
                "n": 0,
            },
        )
        d["edits"] += e
        d["ref"] += len(ref)
        d["audio"] += audio
        d["took"] += took
        d["n"] += 1
        d["hit"] += short(lang) == m["code"]
        name = Path(m["file"]).name[:14]
        print(
            f"{m['language']:9} {name:14} {e:3}/{len(ref):3} {took:5.1f}s/{audio:5.1f}s  {lang}",
            flush=True,
        )
    print(f"\n{engine} {model} ({'language given' if hint else 'language detected'})")
    print(f"{'language':10}{'unit':6}{'error':>8}{'detect':>8}{'RTF':>7}{'clips':>7}")
    for d in per.values():
        err = d["edits"] / max(d["ref"], 1)
        print(
            f"{d['language']:10}{d['unit']:6}{err:8.3f}{d['hit'] / d['n']:8.2f}"
            f"{d['took'] / d['audio']:7.2f}{d['n']:7}"
        )
    tot_a = sum(d["audio"] for d in per.values())
    tot_t = sum(d["took"] for d in per.values())
    median = statistics.median(r["edits"] / max(r["ref_len"], 1) for r in rows)
    print(
        f"overall RTF {tot_t / tot_a:.2f} over {tot_a / 60:.1f} minutes of audio; "
        f"median clip error {median:.3f}"
    )
    if out:
        out.write_text(
            json.dumps(
                {"engine": engine, "model": model, "hint": hint, "rows": rows},
                ensure_ascii=False,
                indent=1,
            )
        )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("clips", type=Path)
    ap.add_argument("--model", required=True)
    ap.add_argument("--engine", choices=["speaches", "mlx", "indic"], default="speaches")
    ap.add_argument(
        "--hint", action="store_true", help="give the language instead of letting Whisper detect it"
    )
    ap.add_argument("--decoding", choices=["ctc", "rnnt"], default="ctc", help="indic engine only")
    ap.add_argument("--only", default="", help="comma separated language codes")
    ap.add_argument("--limit", type=int, default=0, help="clips per language")
    ap.add_argument("--json", type=Path)
    a = ap.parse_args()
    only = {x for x in a.only.split(",") if x}
    main(a.clips, a.model, a.engine, a.hint, only, a.limit, a.json, a.decoding)
