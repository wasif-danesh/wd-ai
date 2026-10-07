#!/usr/bin/env bash
# Create the Secret the chart expects, with random values, if it does not exist yet.
# Usage: scripts/k8s-secrets.sh [namespace] [secret-name]
# Values are generated locally and never printed or passed on a command line.
set -euo pipefail
NS="${1:-wd-ai}"; NAME="${2:-wd-ai-secrets}"

kubectl get namespace "$NS" >/dev/null 2>&1 || kubectl create namespace "$NS" >/dev/null
if kubectl -n "$NS" get secret "$NAME" >/dev/null 2>&1; then
  echo "secret $NS/$NAME already exists (left unchanged)"; exit 0
fi
kubectl -n "$NS" create secret generic "$NAME" \
  --from-env-file=<(printf 'LITELLM_API_KEY=sk-%s\nPOSTGRES_PASSWORD=%s\n' \
    "$(openssl rand -hex 24)" "$(openssl rand -hex 24)") >/dev/null
echo "created secret $NS/$NAME (values not shown)"
