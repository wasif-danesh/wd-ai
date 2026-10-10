#!/usr/bin/env bash
# Build images, create a local kind cluster, and install the chart with the local overlay.
set -euo pipefail
. "$(dirname "$0")/lib.sh"
cd "$ROOT"

CLUSTER=wd-ai; NS=wd-ai; TAG=dev; REG=localhost/wd-ai
[ "$CONTAINER_ENGINE" = "podman" ] && export KIND_EXPERIMENTAL_PROVIDER=podman

step "Checking tools"
miss=0
for t in kind kubectl helm "$CONTAINER_ENGINE"; do
  have "$t" && ok "$t" || { bad "$t is not installed"; miss=1; }
done
[ "$miss" -eq 0 ] || { printf '\nRun %smake setup-k8s%s to install the missing tools.\n' "$BOLD" "$RESET"; exit 1; }
"$CONTAINER_ENGINE" info >/dev/null 2>&1 || { bad "$CONTAINER_ENGINE is not running (macOS: podman machine start)"; exit 1; }
mem="$(podman_vm_mem_mb)"
if [ -n "$mem" ] && [ "$mem" -lt 5500 ]; then
  bad "The Podman VM has only ${mem} MB RAM; kind plus the stack needs about 6 GB."
  printf 'Run %smake setup-k8s%s (offers to resize it), or: podman machine stop && podman machine set --memory 6144 && podman machine start\n' "$BOLD" "$RESET"
  exit 1
fi
if [ "$PLATFORM" = "linux" ] && [ "$CONTAINER_ENGINE" = "podman" ] && [ "$(id -u)" -ne 0 ]; then
  warn "Rootless Podman: kind needs cgroup v2 with cpu/cpuset/io delegation (see docs/runbooks/linux-kind.md). If cluster creation fails, run: sudo -E env \"PATH=\$PATH\" make kind-up"
fi

step "Building images"
for pair in "api:services/api" "media-worker:services/media-worker" "web:apps/web"; do
  name="${pair%%:*}"; dir="${pair##*:}"
  "$CONTAINER_ENGINE" build -q -f "$dir/Containerfile" -t "$REG/$name:$TAG" . >/dev/null
  ok "built $REG/$name:$TAG"
done

step "Cluster"
if kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
  ok "cluster $CLUSTER exists"
else
  kind create cluster --config deploy/kind/cluster.yaml
fi
kubectl config use-context "kind-$CLUSTER" >/dev/null

step "Loading images into the cluster"
for name in api media-worker web; do
  img="$REG/$name:$TAG"
  if [ "$CONTAINER_ENGINE" = "podman" ]; then
    tar="$(mktemp -t wd-ai-image).tar"
    "$CONTAINER_ENGINE" save -o "$tar" "$img" >/dev/null
    kind load image-archive "$tar" --name "$CLUSTER" >/dev/null; rm -f "$tar"
  else
    kind load docker-image "$img" --name "$CLUSTER" >/dev/null
  fi
  ok "loaded $img"
done

step "Secrets"
scripts/k8s-secrets.sh "$NS"

# Where can pods reach the Ollama running natively on this machine?
OLLAMA_EXTERNAL_URL="${OLLAMA_EXTERNAL_URL:-}"
if [ -z "$OLLAMA_EXTERNAL_URL" ]; then
  node="$CLUSTER-control-plane"
  host="host.containers.internal"; [ "$CONTAINER_ENGINE" = "docker" ] && host="host.docker.internal"
  ip="$("$CONTAINER_ENGINE" exec "$node" getent hosts "$host" 2>/dev/null | awk '{print $1; exit}')"
  [ -n "$ip" ] && OLLAMA_EXTERNAL_URL="http://$ip:11434" || OLLAMA_EXTERNAL_URL="http://127.0.0.1:11434"
fi
ok "Ollama URL for pods: $OLLAMA_EXTERNAL_URL"

# The lip sync server runs natively on the Mac (its GPU is not reachable from a container): if it answers on
# this machine, point the worker at it by the same host address as Ollama.
LIPSYNC_EXTERNAL_URL="${LIPSYNC_EXTERNAL_URL:-}"
if [ -z "$LIPSYNC_EXTERNAL_URL" ] && curl -fsS -m 3 "http://127.0.0.1:8191/health" >/dev/null 2>&1; then
  LIPSYNC_EXTERNAL_URL="http://${OLLAMA_EXTERNAL_URL#http://}"; LIPSYNC_EXTERNAL_URL="${LIPSYNC_EXTERNAL_URL%:*}:8191"
fi
if [ -n "$LIPSYNC_EXTERNAL_URL" ]; then ok "Lip sync server for pods: $LIPSYNC_EXTERNAL_URL"
else warn "No lip sync server on 127.0.0.1:8191 (make dev or scripts/lipsync-server.sh start): lip sync is a placeholder"; fi

# KIND_SPEECH=1 runs the CPU speech servers (Kokoro and Whisper, about 6 GB of memory and a few GB of model
# downloads on first use) for real; KIND_SPEECH=all adds the Indic ones (needs the hf-token Secret).
extra=()
case "${KIND_SPEECH:-0}" in
  1) extra+=(--set speech.enabled=true --set mediaWorker.speechMode=real) ;;
  all) extra+=(--set speech.enabled=true --set speechIndic.enabled=true --set sttIndic.enabled=true --set mediaWorker.speechMode=real) ;;
esac
[ "${KIND_SAFEGUARDS:-0}" = "1" ] && extra+=(--set safeguards.forceOn=true)

step "Installing the chart"
helm upgrade --install wd-ai deploy/helm/wd-ai -n "$NS" \
  -f deploy/helm/wd-ai/values/local.yaml \
  --set "ollama.externalUrl=$OLLAMA_EXTERNAL_URL" \
  ${LIPSYNC_EXTERNAL_URL:+--set "lipsync.serverUrl=$LIPSYNC_EXTERNAL_URL"} \
  ${extra[@]+"${extra[@]}"} \
  --wait --timeout 10m

printf '\n%sReady.%s Open %shttp://localhost:3000%s. Check with: make kind-test. Remove with: make kind-down\n' \
  "$GREEN" "$RESET" "$BOLD" "$RESET"
