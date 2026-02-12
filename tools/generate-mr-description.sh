#!/bin/bash
# AI-Powered MR Description Generator
# Analyzes git commits and generates professional MR description using Gemini

set -euo pipefail

# Args
SOURCE_BRANCH="${1:-}"
TARGET_BRANCH="${2:-main}"

if [[ -z "$SOURCE_BRANCH" ]]; then
  echo "Usage: $0 <source-branch> [target-branch]"
  echo "Example: $0 feature/new-api main"
  exit 1
fi

# Get commit diff
COMMITS=$(git log "$TARGET_BRANCH..$SOURCE_BRANCH" --pretty=format:"- %s (%h)" 2>/dev/null || echo "")
FILES=$(git diff --name-status "$TARGET_BRANCH...$SOURCE_BRANCH" | head -20)
STATS=$(git diff --shortstat "$TARGET_BRANCH...$SOURCE_BRANCH")

if [[ -z "$COMMITS" ]]; then
  echo "Error: No commits found between $TARGET_BRANCH and $SOURCE_BRANCH"
  exit 1
fi

# Create prompt for Gemini
PROMPT=$(cat <<EOF
You are a technical writer creating a GitLab Merge Request description.

**Context:**
- Project: GitLab MCP Server (TypeScript)
- Target audience: Developers who will review this MR
- Goal: Clear, professional, actionable description

**Commits:**
$COMMITS

**Changed files:**
$FILES

**Stats:**
$STATS

**Task:**
Generate a professional MR description following this format:

## Summary
[One-sentence summary of what this MR does]

## Changes
- [Bullet point of each major change]
- [Include WHY, not just WHAT]

## Testing
- [How was this tested?]
- [What test cases were added?]

## Breaking Changes
[List any breaking changes, or "None"]

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)

**Rules:**
- Be concise but informative
- Focus on WHY and IMPACT, not just WHAT
- Use technical language but stay readable
- If commits mention issue numbers (e.g., #123), include them
- Identify potential breaking changes from code changes
- Suggest appropriate labels (bug, enhancement, documentation, etc.)

Output ONLY the markdown description, no extra commentary.
EOF
)

# Run Gemini
echo "🤖 Generating MR description using Gemini CLI..."
echo "$PROMPT" | gemini - --output /tmp/mr_description.md 2>/dev/null || {
  echo "Error: Gemini CLI failed. Install: https://github.com/google-gemini/generative-ai-python"
  exit 1
}

# Output result
cat /tmp/mr_description.md
echo ""
echo "✅ Description generated! Copy above for your MR."
echo "Tip: Add --copy flag to copy to clipboard (requires xclip/pbcopy)"
