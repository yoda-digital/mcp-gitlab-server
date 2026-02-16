# Changelog Auto-Gen Specification

**Feature:** AI-powered release notes generator for GitLab MCP Server  
**Target:** v0.4.0 (Mar 1, 2026)  
**Owner:** Anastasia Istrati  

---

## Overview

Automatically generate formatted release notes from merge requests between two commits/tags using Gemini AI.

## MCP Tool: `generate_changelog`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string/number | Yes | GitLab project ID or path |
| `from_ref` | string | Yes | Starting commit/tag (e.g., "v0.3.0", commit SHA) |
| `to_ref` | string | No | Ending commit/tag (default: HEAD/main) |
| `format` | string | No | Output format: "markdown" (default), "json", "html" |
| `categorize` | boolean | No | Group by type (default: true) |
| `include_authors` | boolean | No | Include contributor credits (default: true) |

### Response Schema

```json
{
  "changelog": "Markdown formatted release notes",
  "metadata": {
    "from_ref": "v0.3.0",
    "to_ref": "v0.4.0",
    "merge_requests_count": 12,
    "date_range": {
      "start": "2026-02-01",
      "end": "2026-03-01"
    },
    "categories": {
      "features": 5,
      "fixes": 4,
      "docs": 2,
      "breaking": 1
    }
  }
}
```

### Example Output (Markdown)

```markdown
# Release Notes: v0.4.0

**Released:** 2026-03-01  
**Changes:** 12 merge requests

## 🚀 Features

- **AI-Powered Changelog Generation** - Automatically generate release notes from MRs (#20)
- **Enhanced CI/CD Pipeline Triggers** - Support for manual variables (#18)
- **Multi-Project Pipeline Status** - Track pipelines across related projects (#16)

## 🐛 Bug Fixes

- Fixed authentication token refresh for long-running sessions (#22)
- Resolved pagination issues with large project lists (#21)

## 📚 Documentation

- Added comprehensive API reference for core tools (#19)
- Updated CONTRIBUTING.md with code style guidelines (#17)

## ⚠️ Breaking Changes

- Removed deprecated `list_group_projects_legacy` tool - use `list_group_projects` instead (#23)

## 👥 Contributors

Special thanks to @nalyk, @contributor1, @contributor2 for their contributions to this release!
```

---

## Implementation Plan

### Phase 1: Data Collection (2 days)
- Fetch MRs between refs using GitLab API
- Extract: title, description, labels, author, merged_at
- Handle pagination for large ranges

### Phase 2: AI Categorization (2 days)
- Gemini prompt: analyze MR titles/descriptions
- Categorize: features, fixes, docs, refactor, breaking, other
- Extract key highlights from descriptions

### Phase 3: Formatting (1 day)
- Markdown template with categories
- JSON output for programmatic use
- HTML output for web display

### Phase 4: Testing & Polish (2 days)
- Test with real mcp-gitlab-server releases
- Edge cases: empty ranges, no MRs, API errors
- Documentation and examples

---

## Gemini Prompt Template

```
You are a changelog generator for a GitLab project. Analyze the following merge request and provide:

1. **Category** (one of: feature, fix, docs, refactor, breaking, chore)
2. **One-line summary** (max 80 chars, user-facing, no technical jargon)
3. **Is breaking change?** (yes/no with reason if yes)

Merge Request:
Title: {mr_title}
Description: {mr_description}
Labels: {mr_labels}

Respond in JSON:
{
  "category": "...",
  "summary": "...",
  "breaking": false,
  "breaking_reason": null
}
```

---

## Success Criteria

- [ ] Tool works with mcp-gitlab-server's own releases
- [ ] Categorization accuracy >90% (manual review of 20 MRs)
- [ ] Generates readable, user-friendly notes
- [ ] Handles edge cases gracefully
- [ ] Documentation with 3+ examples
- [ ] Integrated into release workflow

---

## Future Enhancements (v0.5.0+)

- Auto-publish to GitHub Releases
- Slack/Discord announcement integration
- Diff highlighting for breaking changes
- Multi-language changelog support
- Custom categorization rules per project

---

**Status:** ✅ Spec approved, implementation started  
**Branch:** `feature/changelog-autogen`  
**Closes:** #17
