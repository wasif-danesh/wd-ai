#!/usr/bin/env bash
# Smoke test against the local kind cluster. SMOKE_EXPECT_DONE=1 also requires the model
# round trip to succeed (needs a reachable Ollama); otherwise a clean `error` event is accepted,
# which still proves web -> BFF -> API -> LiteLLM wiring.
set -uo pipefail
. "$(dirname "$0")/lib.sh"
NS=wd-ai; fail=0
check() { if eval "$2" >/dev/null 2>&1; then ok "$1"; else bad "$1"; fail=1; fi; }

step "Smoke test"
check "migration job completed" "kubectl -n $NS wait --for=condition=complete job/wd-ai-migrate --timeout=180s"
check "all deployments available" "kubectl -n $NS wait --for=condition=available deploy --all --timeout=180s"
check "usage_events table exists" "kubectl -n $NS exec statefulset/wd-ai-postgres -- psql -U wd -d wd -tAc \"select to_regclass('public.usage_events')\" | grep -q usage_events"
check "web serves / (HTTP 200)" "curl -fsS -m 10 -o /dev/null http://localhost:3000/"

out="$(curl -sN -m 300 -X POST http://localhost:3000/api/products/hello/runs \
  -H 'content-type: application/json' -d '{"input":{"message":"Say hi"}}' 2>&1)"
last="$(printf '%s' "$out" | grep '^event:' | tail -1 | awk '{print $2}')"
if [ "${SMOKE_EXPECT_DONE:-0}" = "1" ]; then
  [ "$last" = "done" ] && ok "streamed run finished with done" || { bad "run ended with '${last:-nothing}', expected done"; fail=1; }
else
  [ "$last" = "done" ] || [ "$last" = "error" ] && ok "streamed run terminated cleanly ($last)" || { bad "no terminal event (got '${last:-nothing}')"; fail=1; }
fi

[ "$fail" -eq 0 ] && printf '\n%sSmoke test passed.%s\n' "$GREEN" "$RESET" || { printf '\n%sSmoke test FAILED.%s\n' "$RED" "$RESET"; exit 1; }
