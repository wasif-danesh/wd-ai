#!/usr/bin/env bash
# Create the Secret the chart expects, with random values, if it does not exist yet.
# Usage: scripts/k8s-secrets.sh [namespace] [secret-name]
# Values are generated locally and never printed or passed on a command line.
set -euo pipefail
NS="${1:-wd-ai}"; NAME="${2:-wd-ai-secrets}"

kubectl get namespace "$NS" >/dev/null 2>&1 || kubectl create namespace "$NS" >/dev/null
if kubectl -n "$NS" get secret "$NAME" >/dev/null 2>&1; then
  # Existing secrets are never changed, but keys added by later releases are filled in.
  added=""
  for key in AUTH_SECRET API_AUTH_SECRET LITELLM_SALT_KEY; do
    if [ -z "$(kubectl -n "$NS" get secret "$NAME" -o "jsonpath={.data.$key}")" ]; then
      value="$(openssl rand -hex 32 | base64 | tr -d '\n')"
      kubectl -n "$NS" patch secret "$NAME" --type merge \
        --patch-file <(printf '{"data":{"%s":"%s"}}' "$key" "$value") >/dev/null
      added="$added $key"
    fi
  done
  echo "secret $NS/$NAME already exists (existing keys unchanged${added:+; added$added})"; exit 0
fi
kubectl -n "$NS" create secret generic "$NAME" \
  --from-env-file=<(printf 'LITELLM_API_KEY=sk-%s\nPOSTGRES_PASSWORD=%s\nSTORAGE_SECRET_KEY=%s\nAUTH_SECRET=%s\nAPI_AUTH_SECRET=%s\nLITELLM_SALT_KEY=%s\n' \
    "$(openssl rand -hex 24)" "$(openssl rand -hex 24)" "$(openssl rand -hex 24)" \
    "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" "$(openssl rand -hex 32)") >/dev/null
echo "created secret $NS/$NAME (values not shown)"
