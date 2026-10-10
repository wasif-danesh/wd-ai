#!/usr/bin/env bash
# Start the lip sync server (ADR-0044) natively: on a Mac its GPU is not reachable from a container.
# Set up once with services/lipsync-musetalk/setup.sh. Then set in .env:
#   LIPSYNC_SERVER_URL=http://host.containers.internal:8191
# Usage: scripts/lipsync-server.sh          (port 8191)
# Environment: MUSETALK_HOME (default .lipsync/musetalk in the repo), LIPSYNC_PORT, LIPSYNC_DEVICE (mps|cuda|cpu).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="${MUSETALK_HOME:-$ROOT/.lipsync/musetalk}"
PORT="${LIPSYNC_PORT:-8191}"
[ -x "$HOME_DIR/venv/bin/python" ] || { echo "run services/lipsync-musetalk/setup.sh first" >&2; exit 1; }
export MUSETALK_DIR="$HOME_DIR/src" PYTORCH_ENABLE_MPS_FALLBACK=1
cd "$ROOT/services/lipsync-musetalk"
exec "$HOME_DIR/venv/bin/python" -m uvicorn server:app --host 127.0.0.1 --port "$PORT"
