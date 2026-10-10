"""Download MuseTalk's model files into its `models/` folder (ADR-0044).

Used by setup.sh on a Mac and by the container at start: the models are fetched once into a
volume, never baked into the image.

    python fetch_models.py <musetalk-dir>        # the folder that holds (or will hold) models/

Safe to run again: files that exist are skipped. Weights: MuseTalk v1.5 (MIT, free for commercial
use), sd-vae-ft-mse (MIT), whisper-tiny (MIT), the BiSeNet face parser and ResNet18 (the
project's own links)."""

import sys
import urllib.request
from pathlib import Path

from huggingface_hub import hf_hub_download

FACE_PARSER_DRIVE_ID = "154JgKpzCPW82qINcVieuPH3fZ2e0P812"
RESNET = "https://download.pytorch.org/models/resnet18-5c106cde.pth"


def main(root: Path) -> None:
    models = root / "models"
    models.mkdir(parents=True, exist_ok=True)
    if (models / ".complete").exists():
        print("MuseTalk models already installed")
        return
    get = lambda repo, name, sub="": hf_hub_download(repo, name, local_dir=models / sub)  # noqa: E731
    get("TMElyralab/MuseTalk", "musetalkV15/musetalk.json", "")
    get("TMElyralab/MuseTalk", "musetalkV15/unet.pth", "")
    for f in ("config.json", "diffusion_pytorch_model.bin"):
        get("stabilityai/sd-vae-ft-mse", f, "sd-vae")
    for f in ("config.json", "pytorch_model.bin", "preprocessor_config.json"):
        get("openai/whisper-tiny", f, "whisper")
    parse = models / "face-parse-bisent"
    parse.mkdir(exist_ok=True)
    if not (parse / "resnet18-5c106cde.pth").exists():
        urllib.request.urlretrieve(RESNET, parse / "resnet18-5c106cde.pth")  # noqa: S310
    if not (parse / "79999_iter.pth").exists():
        import gdown

        gdown.download(id=FACE_PARSER_DRIVE_ID, output=str(parse / "79999_iter.pth"), quiet=True)
    (models / ".complete").write_text("ok\n")
    print("MuseTalk models installed")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "."))
