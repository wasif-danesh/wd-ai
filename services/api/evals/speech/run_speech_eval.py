"""Measure text to speech before building it (ADR-0042).

For each language and voice the speech server offers: synthesise five sentences, send the audio to
Whisper large-v3-turbo through the same server, and compare what Whisper heard with the text (word
error rate, or character error rate for Chinese and Japanese). Reports coverage (which languages and
genders have a voice), the error per voice, the best voice per language and gender, and speed.

The error is a PROXY: Whisper makes mistakes too (more for some languages), so a person must also
listen before a voice is offered, and for Bengali and the other Indic languages a native speaker
decides.

    uv run python services/api/evals/speech/run_speech_eval.py [--per-group 3] [--json out.json]
                                                                 [--audio-dir DIR]

Needs the speech server running (`podman compose up -d speech`) with Kokoro and Whisper in it."""

import argparse
import json
import re
import statistics
import time
import unicodedata
import wave
from io import BytesIO
from pathlib import Path

import httpx
import yaml

HERE = Path(__file__).parent
BASE = "http://localhost:8100"
TTS_MODEL = "speaches-ai/Kokoro-82M-v1.0-ONNX"
STT_MODEL = "deepdml/faster-whisper-large-v3-turbo-ct2"


def normalise(text: str, unit: str) -> list[str]:
    """Lowercase, no punctuation or symbols; words, or single characters without spaces."""
    text = unicodedata.normalize("NFKC", text).lower()
    text = "".join(c for c in text if not unicodedata.category(c).startswith(("P", "S")))
    return list(re.sub(r"\s+", "", text)) if unit == "char" else text.split()


def edit_distance(a: list[str], b: list[str]) -> int:
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def error_rate(reference: str, heard: str, unit: str) -> float:
    ref, hyp = normalise(reference, unit), normalise(heard, unit)
    return edit_distance(ref, hyp) / max(len(ref), 1)


def seconds_of(wav: bytes) -> float:
    with wave.open(BytesIO(wav)) as w:
        return w.getnframes() / w.getframerate()


def main(per_group: int, out: str | None, audio_dir: str | None) -> None:
    corpus = yaml.safe_load((HERE / "corpus.yaml").read_text())["languages"]
    http = httpx.Client(base_url=BASE, timeout=600)
    voices = http.get("/v1/audio/voices", params={"model_id": TTS_MODEL}).json()["voices"]
    groups: dict[tuple[str, str], list[str]] = {}
    for v in voices:
        groups.setdefault((v["language"], v["gender"]), []).append(v["id"])

    coverage = {
        lang: {g: len(groups.get((lang, g), [])) for g in ("female", "male")} for lang in corpus
    }
    uncovered = sorted({lang for lang, _ in groups} - set(corpus))
    results: list[dict] = []
    for (lang, gender), ids in sorted(groups.items()):
        if lang not in corpus:
            continue
        spec = corpus[lang]
        for voice in ids[:per_group]:
            errors, synth_s, audio_s, stt_s = [], 0.0, 0.0, 0.0
            for n, sentence in enumerate(spec["sentences"]):
                t = time.perf_counter()
                r = http.post(
                    "/v1/audio/speech",
                    json={"model": TTS_MODEL, "voice": voice, "input": sentence,
                          "response_format": "wav"},
                )  # fmt: skip
                r.raise_for_status()
                synth_s += time.perf_counter() - t
                audio_s += seconds_of(r.content)
                if audio_dir:
                    d = Path(audio_dir) / lang
                    d.mkdir(parents=True, exist_ok=True)
                    (d / f"{voice}-{n + 1}.wav").write_bytes(r.content)
                t = time.perf_counter()
                heard = http.post(
                    "/v1/audio/transcriptions",
                    files={"file": ("a.wav", r.content, "audio/wav")},
                    data={"model": STT_MODEL, "language": spec["whisper"],
                          "response_format": "json"},
                ).json()["text"]  # fmt: skip
                stt_s += time.perf_counter() - t
                errors.append(error_rate(sentence, heard, spec["unit"]))
            results.append(
                {
                    "language": lang, "gender": gender, "voice": voice, "unit": spec["unit"],
                    "error_rate": round(statistics.mean(errors), 3),
                    "worst_sentence": round(max(errors), 3),
                    "seconds_to_make_1s_of_speech": round(synth_s / (audio_s or 1), 2),
                    "seconds_to_transcribe_1s": round(stt_s / (audio_s or 1), 2),
                }
            )  # fmt: skip
            print(
                f"{lang:6} {gender:6} {voice:14} error {results[-1]['error_rate']:.3f}", flush=True
            )

    best = {}
    for r in results:
        key = f"{r['language']}/{r['gender']}"
        if key not in best or r["error_rate"] < best[key]["error_rate"]:
            best[key] = {"voice": r["voice"], "error_rate": r["error_rate"]}
    by_lang: dict[str, list[float]] = {}
    for r in results:
        by_lang.setdefault(r["language"], []).append(r["error_rate"])
    report = {
        "voices_on_server": len(voices),
        "voices_measured": len(results),
        "coverage_voices_per_language_and_gender": coverage,
        "server_languages_without_a_sentence_set": uncovered,
        "mean_error_by_language": {
            k: round(statistics.mean(v), 3) for k, v in sorted(by_lang.items())
        },
        "best_voice": best,
        "speed": {
            "seconds_to_make_1s_of_speech_median": statistics.median(
                r["seconds_to_make_1s_of_speech"] for r in results
            ),
            "seconds_to_transcribe_1s_median": statistics.median(
                r["seconds_to_transcribe_1s"] for r in results
            ),
        },
        "voices": results,
    }
    text = json.dumps(report, indent=2, ensure_ascii=False)
    print(text)
    if out:
        Path(out).write_text(text)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-group", type=int, default=3)
    ap.add_argument("--json", default=None)
    ap.add_argument("--audio-dir", default=None)
    a = ap.parse_args()
    main(a.per_group, a.json, a.audio_dir)
