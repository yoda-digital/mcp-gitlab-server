# GitLab MCP Server Tools

Developer utilities for the mcp-gitlab-server project.

## generate-mr-description.sh

**AI-powered Merge Request description generator.**

Analyzes your commits and generates professional, comprehensive MR descriptions using Gemini CLI.

### Usage

```bash
./tools/generate-mr-description.sh <source-branch> [target-branch]
```

### Example

```bash
# Generate description for feature branch against main
./tools/generate-mr-description.sh feature/ci-cd-tools main
```

Output:
```markdown
## Summary
Add comprehensive CI/CD pipeline management tools to GitLab MCP server

## Changes
- Implement pipeline listing, triggering, and job management
- Add support for pipeline variables and artifacts
- Include retry and cancel operations for jobs
- Comprehensive test coverage with 38 new test cases

## Testing
- Unit tests for all new API methods
- Integration tests for pipeline operations
- Vitest test framework configured

## Breaking Changes
None

## Checklist
- [x] Tests added/updated
- [x] Documentation updated
- [ ] Changelog updated
```

### Requirements

- Git repository with commits
- Gemini CLI installed: `pip install google-generativeai`
- GEMINI_API_KEY environment variable set

### Features

- ✅ Analyzes commit messages for context
- ✅ Reviews changed files for scope
- ✅ Generates professional descriptions
- ✅ Suggests appropriate labels
- ✅ Identifies breaking changes
- ✅ Creates testing checklist

### Tips

- Write clear commit messages for better descriptions
- Review and edit the generated description before posting
- Use for both internal and external contributions
