#!/bin/bash
# Daily metrics for mcp-gitlab-server
# Run: bash ~/gits/mcp-gitlab-server/scripts/daily-metrics.sh

cd ~/gits/mcp-gitlab-server || exit 1

echo "=== mcp-gitlab-server Daily Metrics ==="
echo "Date: $(date '+%Y-%m-%d %H:%M')"
echo ""

# GitHub metrics
echo "Stars: $(gh repo view yoda-digital/mcp-gitlab-server --json stargazerCount -q .stargazerCount 2>/dev/null || echo 'N/A')"
echo "Forks: $(gh repo view yoda-digital/mcp-gitlab-server --json forkCount -q .forkCount 2>/dev/null || echo 'N/A')"
echo "Open Issues: $(gh issue list --state open 2>/dev/null | wc -l)"
echo "Open PRs: $(gh pr list --state open 2>/dev/null | wc -l)"
echo ""

# Latest activity
echo "Latest commit: $(git log -1 --oneline 2>/dev/null || echo 'N/A')"
echo ""

# Issues needing response
NEEDS_RESPONSE=$(gh issue list --label "needs-response" --state open 2>/dev/null | wc -l)
if [ "$NEEDS_RESPONSE" -gt 0 ]; then
  echo "⚠️  $NEEDS_RESPONSE issue(s) need response!"
fi

echo "================================="
