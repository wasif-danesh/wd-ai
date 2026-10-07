# Shared helpers for setup/preflight/dev scripts. Source this file; bash 3.2 compatible.

CONTAINER_ENGINE="${CONTAINER_ENGINE:-podman}"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BOLD=""; RESET=""
fi

ok()   { printf '%s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$RESET" "$*"; }
bad()  { printf '%s✗%s %s\n' "$RED" "$RESET" "$*"; }
step() { printf '\n%s==> %s%s\n' "$BOLD" "$*" "$RESET"; }
have() { command -v "$1" >/dev/null 2>&1; }

# Models the stack needs, derived from the single source of truth (LiteLLM config).
required_models() {
  grep -o 'ollama_chat/[^[:space:]]*' "$ROOT/deploy/compose/litellm.yaml" | sed 's|ollama_chat/||' | sort -u
}

ollama_up() { curl -fsS -m 3 "$OLLAMA_URL/api/tags" >/dev/null 2>&1; }

ollama_has_model() {
  curl -fsS -m 5 "$OLLAMA_URL/api/tags" 2>/dev/null | grep -q "\"name\":\"$1\""
}

env_value() { # env_value KEY -> value from .env (never printed by callers)
  [ -f "$ROOT/.env" ] || return 0
  grep -E "^$1=" "$ROOT/.env" | head -1 | cut -d= -f2-
}
