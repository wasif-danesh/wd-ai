#!/usr/bin/env bash
# One-shot, idempotent setup for a fresh clone: installs missing tools, starts the container
# engine and Ollama, pulls the models, creates .env and installs dependencies.
# Every install or large download asks first. Use -y (or ASSUME_YES=1) to accept all.
set -euo pipefail
. "$(dirname "$0")/lib.sh"

ASSUME_YES="${ASSUME_YES:-0}"
[ "${1:-}" = "-y" ] && ASSUME_YES=1

confirm() {
  [ "$ASSUME_YES" = "1" ] && return 0
  [ -t 0 ] || { bad "Not a terminal; re-run with -y to accept: $1"; return 1; }
  printf '%s [y/N] ' "$1"; read -r reply; [ "$reply" = "y" ] || [ "$reply" = "Y" ]
}

OS="$(uname -s)"; ARCH="$(uname -m)"
step "Detected $OS / $ARCH"

# ---- 1. Tools --------------------------------------------------------------------------
step "Checking tools"
missing=""
for t in "$CONTAINER_ENGINE" uv pnpm node ollama curl git; do
  have "$t" && ok "$t" || { bad "$t missing"; missing="$missing $t"; }
done
compose_ok=1
if have "$CONTAINER_ENGINE" && ! "$CONTAINER_ENGINE" compose version >/dev/null 2>&1; then
  bad "compose provider missing"; compose_ok=0
fi

if [ -n "$missing" ] || [ "$compose_ok" = "0" ]; then
  case "$OS" in
    Darwin)
      have brew || { bad "Homebrew is required. Install it from https://brew.sh, then re-run 'make setup'."; exit 1; }
      pkgs=""
      for t in $missing; do
        case "$t" in
          podman) pkgs="$pkgs podman" ;; uv) pkgs="$pkgs uv" ;; pnpm) pkgs="$pkgs pnpm" ;;
          node) pkgs="$pkgs node" ;; ollama) pkgs="$pkgs ollama" ;; git) pkgs="$pkgs git" ;;
        esac
      done
      [ "$compose_ok" = "0" ] && pkgs="$pkgs docker-compose"
      if [ -n "$pkgs" ]; then
        confirm "Install with Homebrew:$pkgs ?" || { bad "Cannot continue without:$pkgs"; exit 1; }
        # shellcheck disable=SC2086
        brew install $pkgs
      fi
      ;;
    Linux)
      have apt-get || { bad "Only apt-based Linux is automated. Install manually:$missing"; exit 1; }
      confirm "Install missing tools with apt/sudo and the official uv and Ollama install scripts?" \
        || { bad "Cannot continue without:$missing"; exit 1; }
      sudo apt-get update
      for t in $missing; do
        case "$t" in
          podman) sudo apt-get install -y podman ;;
          node) sudo apt-get install -y nodejs npm ;;
          curl) sudo apt-get install -y curl ;;
          git) sudo apt-get install -y git ;;
          pnpm) sudo npm install -g pnpm ;;
          uv) curl -LsSf https://astral.sh/uv/install.sh | sh; export PATH="$HOME/.local/bin:$PATH" ;;
          ollama) curl -fsSL https://ollama.com/install.sh | sh ;;
        esac
      done
      [ "$compose_ok" = "0" ] && sudo apt-get install -y podman-compose
      ;;
    *) bad "Unsupported OS: $OS"; exit 1 ;;
  esac
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
[ "$NODE_MAJOR" -ge 22 ] && ok "node $NODE_MAJOR" || warn "Node $NODE_MAJOR found; Node 22+ is required"

# ---- 2. Container engine ---------------------------------------------------------------
step "Container engine"
if [ "$CONTAINER_ENGINE" = "podman" ] && [ "$OS" = "Darwin" ]; then
  if ! podman machine list --format '{{.Name}}' 2>/dev/null | grep -q .; then
    echo "Creating the Podman VM (4 CPUs, 6 GB RAM)..."
    podman machine init --cpus 4 --memory 6144
  fi
  podman info >/dev/null 2>&1 || podman machine start
fi
"$CONTAINER_ENGINE" info >/dev/null 2>&1 && ok "$CONTAINER_ENGINE is running" \
  || { bad "$CONTAINER_ENGINE is not running"; exit 1; }

# ---- 3. Ollama and models --------------------------------------------------------------
step "Ollama"
if ! ollama_up; then
  echo "Starting Ollama..."
  if [ "$OS" = "Darwin" ] && have brew && brew list ollama >/dev/null 2>&1; then
    brew services start ollama >/dev/null
  elif have systemctl && systemctl list-unit-files 2>/dev/null | grep -q '^ollama'; then
    sudo systemctl start ollama
  else
    nohup ollama serve >/tmp/ollama.log 2>&1 &
  fi
  for _ in $(seq 1 30); do ollama_up && break; sleep 1; done
fi
ollama_up && ok "Ollama reachable at $OLLAMA_URL" || { bad "Ollama did not start"; exit 1; }

# RAM / disk heads-up for the default 20B model.
if [ "$OS" = "Darwin" ]; then mem_gb=$(( $(sysctl -n hw.memsize) / 1073741824 ))
else mem_gb=$(( $(awk '/MemTotal/{print $2}' /proc/meminfo) / 1048576 )); fi
free_gb=$(df -Pk "$HOME" | awk 'NR==2{print int($4/1048576)}')
[ "$mem_gb" -ge 16 ] || warn "Only ${mem_gb} GB RAM: gpt-oss:20b needs ~16 GB and may be very slow or fail. Edit deploy/compose/litellm.yaml to use a smaller model."
[ "$OS" = "Darwin" ] && [ "$ARCH" = "x86_64" ] && warn "Intel Mac: Ollama runs CPU-only, so replies will be slow."

for m in $(required_models); do
  if ollama_has_model "$m"; then ok "model $m already pulled"; continue; fi
  [ "$free_gb" -ge 20 ] || warn "Only ${free_gb} GB free disk; $m needs ~13 GB."
  confirm "Download model $m now (large download, ~13 GB for gpt-oss:20b)?" \
    && ollama pull "$m" || { bad "Model $m not pulled"; exit 1; }
done

# ---- 4. .env ---------------------------------------------------------------------------
step "Environment file"
[ -f "$ROOT/.env" ] || { cp "$ROOT/.env.example" "$ROOT/.env"; ok "created .env from .env.example"; }
set_secret() { # set_secret KEY PLACEHOLDER: replace a placeholder with a random value
  cur="$(env_value "$1")"
  if [ -z "$cur" ] || [ "$cur" = "$2" ]; then
    val="$3$(openssl rand -hex 24)"
    sed -i.bak "s|^$1=.*|$1=$val|" "$ROOT/.env" && rm -f "$ROOT/.env.bak"
    ok "generated $1 (not printed)"
  else ok "$1 already set"; fi
}
set_secret LITELLM_API_KEY sk-dev-change-me sk-
set_secret AUTH_SECRET change-me ""
set_secret MINIO_ROOT_PASSWORD change-me ""

# ---- 5. Dependencies -------------------------------------------------------------------
step "Dependencies"
(cd "$ROOT" && uv sync --all-packages)
(cd "$ROOT" && CI=true pnpm install)

printf '\n%sSetup complete.%s Next: %smake dev%s  (starts the stack, runs migrations, opens on http://localhost:3000)\n' \
  "$GREEN" "$RESET" "$BOLD" "$RESET"
