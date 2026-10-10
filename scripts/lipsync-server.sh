#!/usr/bin/env bash
# The lip sync server (ADR-0044), run natively: on a Mac its GPU is not reachable from a container.
# Set up once with services/lipsync-musetalk/setup.sh. Then set in .env:
#   LIPSYNC_SERVER_URL=http://host.containers.internal:8191
# `make dev` starts it and `make down` stops it.
#
# Usage: scripts/lipsync-server.sh [run|start|stop|status]
#   run     in the foreground (the default)
#   start   in the background; does nothing if it is running or not set up (never fails the caller)
#   stop    stop the background one
#   status  say whether it answers
# Environment: MUSETALK_HOME (default .lipsync/musetalk in the repo), LIPSYNC_PORT, LIPSYNC_DEVICE.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="${MUSETALK_HOME:-$ROOT/.lipsync/musetalk}"
PORT="${LIPSYNC_PORT:-8191}"
PIDFILE="$ROOT/.lipsync/server.pid"
LOGFILE="$ROOT/.lipsync/server.log"
up() { curl -fsS -m 2 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; }

run() {
  [ -x "$HOME_DIR/venv/bin/python" ] || { echo "run services/lipsync-musetalk/setup.sh first" >&2; exit 1; }
  export MUSETALK_DIR="$HOME_DIR/src" PYTORCH_ENABLE_MPS_FALLBACK=1
  cd "$ROOT/services/lipsync-musetalk"
  exec "$HOME_DIR/venv/bin/python" -m uvicorn server:app --host 127.0.0.1 --port "$PORT"
}

case "${1:-run}" in
  run) run ;;
  start)
    if up; then echo "lip sync server already running on port $PORT"; exit 0; fi
    if [ ! -x "$HOME_DIR/venv/bin/python" ]; then
      echo "lip sync server not set up (run services/lipsync-musetalk/setup.sh); Lip Sync is off"
      exit 0
    fi
    mkdir -p "$ROOT/.lipsync"
    nohup "$0" run >"$LOGFILE" 2>&1 &
    echo $! >"$PIDFILE"
    for _ in $(seq 1 30); do up && { echo "lip sync server started on port $PORT (log: .lipsync/server.log)"; exit 0; }; sleep 1; done
    echo "lip sync server is starting; see .lipsync/server.log"
    ;;
  stop)
    if [ -f "$PIDFILE" ]; then
      pid="$(cat "$PIDFILE")"
      # the pid is the wrapper shell; stop it and the server it started
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
      rm -f "$PIDFILE"
      echo "lip sync server stopped"
    else
      echo "lip sync server was not started by this script"
    fi
    ;;
  status) up && echo "lip sync server answers on port $PORT" || { echo "lip sync server is not running"; exit 1; } ;;
  *) echo "usage: $0 [run|start|stop|status]" >&2; exit 2 ;;
esac
