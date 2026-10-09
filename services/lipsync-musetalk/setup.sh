#!/usr/bin/env bash
# Install the lip sync server's engine: MuseTalk v1.5 (MIT) and its weights, about 4 GB (ADR-0044).
# Everything goes into one folder (default ~/MuseTalk-Spike); nothing is installed into the repo.
# Weights: MuseTalk v1.5 (MIT, free for commercial use), sd-vae-ft-mse (MIT), whisper-tiny (MIT),
# the BiSeNet face parser and ResNet18 (the project's own links). face-alignment downloads its
# 170 MB detector and landmark model by itself on first use.
set -euo pipefail
DIR="${MUSETALK_HOME:-$HOME/MuseTalk-Spike}"
COMMIT=0a89dec   # the version this was tested with
mkdir -p "$DIR"
cd "$DIR"
[ -d src ] || git clone -q https://github.com/TMElyralab/MuseTalk.git src
(cd src && git checkout -q "$COMMIT")
[ -d venv ] || uv venv venv --python 3.11 -q
# shellcheck disable=SC1091
source venv/bin/activate
uv pip install -q -r "$(cd "$(dirname "$0")" && pwd)/requirements.txt"
cd src
mkdir -p models/musetalkV15 models/sd-vae models/whisper models/face-parse-bisent
export HF_HUB_DISABLE_XET=1
python - <<'PY'
from huggingface_hub import hf_hub_download as get
M = "models"
get("TMElyralab/MuseTalk", "musetalkV15/musetalk.json", local_dir=M)
get("TMElyralab/MuseTalk", "musetalkV15/unet.pth", local_dir=M)
for f in ("config.json", "diffusion_pytorch_model.bin"):
    get("stabilityai/sd-vae-ft-mse", f, local_dir=M + "/sd-vae")
for f in ("config.json", "pytorch_model.bin", "preprocessor_config.json"):
    get("openai/whisper-tiny", f, local_dir=M + "/whisper")
PY
[ -f models/face-parse-bisent/resnet18-5c106cde.pth ] || curl -sL -o models/face-parse-bisent/resnet18-5c106cde.pth https://download.pytorch.org/models/resnet18-5c106cde.pth
[ -f models/face-parse-bisent/79999_iter.pth ] || gdown 154JgKpzCPW82qINcVieuPH3fZ2e0P812 -O models/face-parse-bisent/79999_iter.pth
echo "done: start the server with scripts/lipsync-server.sh"
