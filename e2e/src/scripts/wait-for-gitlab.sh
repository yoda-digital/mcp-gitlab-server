#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Wait for GitLab to be fully ready (HTTP 200 on /-/readiness)
# Timeout: 5 minutes (GitLab CE takes 2-4 min to boot)
# ---------------------------------------------------------------------------
set -euo pipefail

GITLAB_URL="${GITLAB_URL:-http://gitlab:80}"
TIMEOUT="${GITLAB_READY_TIMEOUT:-300}"
INTERVAL=5

echo "⏳ Waiting for GitLab at ${GITLAB_URL} (timeout: ${TIMEOUT}s)..."

elapsed=0
until curl -sf "${GITLAB_URL}/-/readiness" > /dev/null 2>&1; do
  if [ "$elapsed" -ge "$TIMEOUT" ]; then
    echo "❌ GitLab did not become ready within ${TIMEOUT}s"
    exit 1
  fi
  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
  echo "   ...waiting (${elapsed}s elapsed)"
done

echo "✅ GitLab is ready (took ~${elapsed}s)"
