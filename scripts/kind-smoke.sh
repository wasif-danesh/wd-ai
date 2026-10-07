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
check "rag_chunks table + pgvector extension exist" "kubectl -n $NS exec statefulset/wd-ai-postgres -- psql -U wd -d wd -tAc \"select to_regclass('public.rag_chunks'), (select count(*) from pg_extension where extname='vector')\" | grep -q 'rag_chunks|1'"
check "web serves / (HTTP 200)" "curl -fsS -m 10 -o /dev/null http://localhost:3000/"
check "My songs page renders (server-side read of the API)" "curl -fsS -m 20 http://localhost:3000/songs | grep -q 'My songs'"
check "songs API answers through the BFF" "curl -fsS -m 10 http://localhost:3000/api/products/wd-music-ai/songs | grep -q '\"songs\"'"
check "an unknown song is a real 404" "test \"\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/songs/00000000-0000-0000-0000-000000000000)\" = 404"

# Media pipeline: queue -> worker (stub mode) -> object storage -> completion -> graph resumes.
# Needs no LLM or GPU, so it also runs in CI.
media="$(curl -sN -m 120 -X POST http://localhost:3000/api/products/media-demo/runs \
  -H 'content-type: application/json' -d '{"input":{"prompt":"a lighthouse"}}' 2>&1)"
check "media job: queued, ran, completed" "printf '%s' \"\$media\" | grep -q 'event: job_progress' && printf '%s' \"\$media\" | grep -q '\"status\": \"completed\"'"
check "media run finished with done and an image URL" "printf '%s' \"\$media\" | tail -4 | grep -q 'event: done' && printf '%s' \"\$media\" | grep -q 'image_url'"
check "worker usage recorded (job.completed)" "kubectl -n $NS exec statefulset/wd-ai-postgres -- psql -U wd -d wd -tAc \"select count(*) from usage_events where kind='job.completed'\" | grep -qv '^0\$'"

# The music product through the real guardrail and lyrics models: must reach the approval step.
if [ "${SMOKE_EXPECT_DONE:-0}" = "1" ]; then
  song="$(curl -sN -m 300 -X POST http://localhost:3000/api/products/wd-music-ai/runs \
    -H 'content-type: application/json' -d '{"input":{"idea":"a rainy night in Tokyo","genre":"indie pop"}}' 2>&1)"
  check "song: guardrail passed, lyrics written, waiting for approval" "printf '%s' \"\$song\" | tail -3 | grep -q 'event: interrupt' && printf '%s' \"\$song\" | grep -q 'approve_lyrics'" \
    || { echo "    what the stream ended with:"; printf '%s' "$song" | tail -c 700 | sed 's/^/    /'; }
fi

out="$(curl -sN -m 300 -X POST http://localhost:3000/api/products/hello/runs \
  -H 'content-type: application/json' -d '{"input":{"message":"Say hi"}}' 2>&1)"
last="$(printf '%s' "$out" | grep '^event:' | tail -1 | awk '{print $2}')"
if [ "${SMOKE_EXPECT_DONE:-0}" = "1" ]; then
  [ "$last" = "done" ] && ok "streamed run finished with done" || { bad "run ended with '${last:-nothing}', expected done"; fail=1; }
else
  [ "$last" = "done" ] || [ "$last" = "error" ] && ok "streamed run terminated cleanly ($last)" || { bad "no terminal event (got '${last:-nothing}')"; fail=1; }
fi

if [ "${SMOKE_EXPECT_DONE:-0}" = "1" ]; then
  check "token usage recorded for the run" "kubectl -n $NS exec statefulset/wd-ai-postgres -- psql -U wd -d wd -tAc \"select count(*) from usage_events where kind='llm.output_tokens'\" | grep -qv '^0\$'"
fi

[ "$fail" -eq 0 ] && printf '\n%sSmoke test passed.%s\n' "$GREEN" "$RESET" || { printf '\n%sSmoke test FAILED.%s\n' "$RED" "$RESET"; exit 1; }
