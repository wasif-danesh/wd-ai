#!/usr/bin/env bash
# Start the second ComfyUI that video runs on (ADR-0037), next to your normal one.
#
# Why a second one: LTX-Video needs its diffusion model in fp32 on Apple silicon, and --fp32-unet
# applies to the whole process; sharing it would make the image and music models slower and bigger.
# Both ComfyUIs share one GPU and one GPU id, so the worker still runs one job at a time.
#
# Usage: scripts/comfyui-video.sh            (port 8189)
# Environment: COMFYUI_DIR (the ComfyUI folder with main.py and .venv), COMFYUI_VIDEO_PORT,
#              COMFYUI_EXTRA_ARGS (for example --extra-model-paths-config <file>,
#              --input-directory <dir>, --output-directory <dir> to match your first ComfyUI).
# Then set COMFYUI_VIDEO_BASE_URL=http://host.containers.internal:8189 in .env.
set -euo pipefail
DIR="${COMFYUI_DIR:-$HOME/ComfyUI-Installs/ComfyUI/ComfyUI}"
PORT="${COMFYUI_VIDEO_PORT:-8189}"
PY="$DIR/.venv/bin/python3"
[ -x "$PY" ] || { echo "no Python at $PY: set COMFYUI_DIR to your ComfyUI folder" >&2; exit 1; }
[ -f "$DIR/main.py" ] || { echo "no main.py in $DIR: set COMFYUI_DIR" >&2; exit 1; }
cd "$DIR"
# $COMFYUI_EXTRA_ARGS is deliberately unquoted: it is a list of arguments
# shellcheck disable=SC2086
exec "$PY" -s main.py --port "$PORT" --fp32-unet --bf16-vae --bf16-text-enc ${COMFYUI_EXTRA_ARGS:-}
