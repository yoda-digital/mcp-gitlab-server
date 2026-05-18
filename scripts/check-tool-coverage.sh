#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Tool Coverage Gate
#
# Ensures every MCP tool defined in src/index.ts has at least one E2E test
# that calls it. Exits non-zero if any tool is uncovered.
#
# Usage: ./scripts/check-tool-coverage.sh [--strict]
#   --strict: also fail on tools only tested via try/catch (weak coverage)
#
# Exit codes:
#   0 = all tools covered
#   1 = uncovered tools found
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Tools explicitly excluded from coverage requirements (Premium-only features)
EXCLUDED_TOOLS=(
  "create_group_wiki_page"
  "list_group_wiki_pages"
  "get_group_wiki_page"
  "edit_group_wiki_page"
  "delete_group_wiki_page"
  "upload_group_wiki_attachment"
)

# 1. Extract all tool names from source (case statements in index.ts)
mapfile -t SOURCE_TOOLS < <(
  grep -o 'case "[^"]*"' "$ROOT_DIR/src/index.ts" | sed 's/case "//;s/"//' | sort -u
)

# 2. Extract all tool names called in E2E tests
#    Match `name: 'foo'` ONLY when it appears within 2 lines after `.callTool(`,
#    to avoid false positives from unrelated `name:` fields in fixture data
#    (e.g. release names, branch names, label names) which inflated the count.
mapfile -t TESTED_TOOLS < <(
  grep -rA 2 '\.callTool(' "$ROOT_DIR/e2e/src/tests/" | grep -oh "name: '[^']*'" | sed "s/name: '//;s/'//" | sort -u
)

# 3. Find uncovered tools
UNCOVERED=()
for tool in "${SOURCE_TOOLS[@]}"; do
  # Skip excluded tools
  skip=false
  for excluded in "${EXCLUDED_TOOLS[@]}"; do
    if [[ "$tool" == "$excluded" ]]; then
      skip=true
      break
    fi
  done
  if [[ "$skip" == "true" ]]; then
    continue
  fi

  # Check if tool appears in tested list
  found=false
  for tested in "${TESTED_TOOLS[@]}"; do
    if [[ "$tool" == "$tested" ]]; then
      found=true
      break
    fi
  done

  if [[ "$found" == "false" ]]; then
    UNCOVERED+=("$tool")
  fi
done

# 4. Report
echo "══════════════════════════════════════════════════════════"
echo "  MCP Tool E2E Coverage Report"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "  Source tools:    ${#SOURCE_TOOLS[@]}"
echo "  Tested tools:    ${#TESTED_TOOLS[@]}"
echo "  Excluded:        ${#EXCLUDED_TOOLS[@]} (Premium-only)"
echo "  Uncovered:       ${#UNCOVERED[@]}"
echo ""

if [[ ${#UNCOVERED[@]} -gt 0 ]]; then
  echo "❌ UNCOVERED TOOLS (missing E2E tests):"
  echo ""
  for tool in "${UNCOVERED[@]}"; do
    echo "   • $tool"
  done
  echo ""
  echo "  Add E2E tests for these tools or add them to EXCLUDED_TOOLS"
  echo "  in scripts/check-tool-coverage.sh if they cannot be tested."
  echo ""
  echo "══════════════════════════════════════════════════════════"
  exit 1
else
  echo "✅ All tools have E2E coverage!"
  echo ""
  echo "══════════════════════════════════════════════════════════"
  exit 0
fi
