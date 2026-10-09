"""Fetch a few real recordings per language from FLEURS for the transcription evaluation (ADR-0043).

FLEURS (Google, CC-BY-4.0) is read speech with a reference text. Only the first N clips of each
language's test split are taken: the audio archive is streamed and the download stops once enough
clips have come out, so a language costs about 8 MB, not the whole 660 MB archive. The clips go to a
scratch directory and are not kept in the repository.

Attribution: FLEURS, Conneau et al., "FLEURS: Few-shot Learning Evaluation of Universal
Representations of Speech", 2022 (CC-BY-4.0).

    uv run python services/api/evals/transcribe/fetch_fleurs.py OUT_DIR [--per-language 10]
"""

import argparse
import csv
import io
import json
import tarfile
from pathlib import Path

import httpx

BASE = "https://huggingface.co/datasets/google/fleurs/resolve/main/data"
# language label -> (FLEURS config, Whisper language code, unit of error)
LANGUAGES = {
    "Bengali": ("bn_in", "bn", "word"),
    "Hindi": ("hi_in", "hi", "word"),
    "English": ("en_us", "en", "word"),
    "Spanish": ("es_419", "es", "word"),
    "French": ("fr_fr", "fr", "word"),
    "German": ("de_de", "de", "word"),
    "Arabic": ("ar_eg", "ar", "word"),
    "Russian": ("ru_ru", "ru", "word"),
    "Japanese": ("ja_jp", "ja", "char"),
    "Chinese": ("cmn_hans_cn", "zh", "char"),
}


class Stream(io.RawIOBase):
    """A readable view of an HTTP response body, so tarfile can read an archive as it arrives."""

    def __init__(self, response: httpx.Response):
        self._it = response.iter_bytes(1 << 16)
        self._buf = b""

    def readable(self) -> bool:
        return True

    def readinto(self, b) -> int:  # type: ignore[override]
        while not self._buf:
            try:
                self._buf = next(self._it)
            except StopIteration:
                return 0
        n = min(len(b), len(self._buf))
        b[:n] = self._buf[:n]
        self._buf = self._buf[n:]
        return n


def references(client: httpx.Client, config: str) -> dict[str, str]:
    text = client.get(f"{BASE}/{config}/test.tsv", follow_redirects=True, timeout=120).text
    rows = csv.reader(io.StringIO(text), delimiter="\t", quoting=csv.QUOTE_NONE)
    # id, file_name, raw_transcription, transcription, characters, num_samples, gender
    return {r[1]: r[3] for r in rows if len(r) >= 4}


def main(out: Path, per_language: int) -> None:
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    with httpx.Client() as client:
        for label, (config, code, unit) in LANGUAGES.items():
            refs = references(client, config)
            folder = out / code
            folder.mkdir(exist_ok=True)
            got = 0
            url = f"{BASE}/{config}/audio/test.tar.gz"
            with client.stream("GET", url, follow_redirects=True, timeout=300) as r:
                r.raise_for_status()
                with tarfile.open(fileobj=Stream(r), mode="r|gz") as tar:
                    for member in tar:
                        name = Path(member.name).name
                        if not member.isfile() or name not in refs:
                            continue
                        data = tar.extractfile(member).read()  # type: ignore[union-attr]
                        (folder / name).write_bytes(data)
                        manifest.append(
                            {
                                "language": label,
                                "code": code,
                                "unit": unit,
                                "file": f"{code}/{name}",
                                "reference": refs[name],
                                "bytes": len(data),
                            }
                        )
                        got += 1
                        if got >= per_language:
                            break
            print(f"{label}: {got} clips")
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    total = sum(m["bytes"] for m in manifest)
    print(f"{len(manifest)} clips, {total / 1e6:.1f} MB, manifest at {out / 'manifest.json'}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("out", type=Path)
    ap.add_argument("--per-language", type=int, default=10)
    a = ap.parse_args()
    main(a.out, a.per_language)
