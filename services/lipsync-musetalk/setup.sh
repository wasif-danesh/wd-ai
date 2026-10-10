#!/usr/bin/env bash
# Install the lip sync server's engine: MuseTalk v1.5 (MIT) and its weights, about 4 GB (ADR-0044).
# Everything goes into one folder (default .lipsync/musetalk in the repo, which git and the container
# builds ignore): the cloned MuseTalk code, its virtualenv and the weights.
# Weights: MuseTalk v1.5 (MIT, free for commercial use), sd-vae-ft-mse (MIT), whisper-tiny (MIT),
# the BiSeNet face parser and ResNet18 (the project's own links). face-alignment downloads its
# 170 MB detector and landmark model by itself on first use.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="${MUSETALK_HOME:-$(cd "$(dirname "$0")/../.." && pwd)/.lipsync/musetalk}"
COMMIT=0a89dec   # the version this was tested with
mkdir -p "$DIR"
cd "$DIR"
[ -d src ] || git clone -q https://github.com/TMElyralab/MuseTalk.git src
(cd src && git checkout -q "$COMMIT")
[ -d venv ] || uv venv venv --python 3.11 -q
# shellcheck disable=SC1091
source venv/bin/activate
uv pip install -q -r "$HERE/requirements.txt"
python "$HERE/fetch_models.py" "$DIR/src"
echo "done: start the server with scripts/lipsync-server.sh"
