# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitLab MCP Server - A Model Context Protocol server enabling AI assistants to interact with GitLab resources. Exposes 30+ tools for repository management, file operations, issues, merge requests, wikis, and member management.

**Package**: `@yoda.digital/gitlab-mcp-server`

## Build & Development Commands

```bash
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled server
npm run dev      # Development with ts-node hot reload
```

**Note**: `npm test` is a placeholder (exits with error). No linting command exists; TypeScript strict mode handles type checking.

## Architecture

```
src/
├── index.ts       # MCP server setup, tool registration, and request handlers (main switch statement)
├── gitlab-api.ts  # GitLabApi class - all GitLab REST API interactions
├── schemas.ts     # Zod schemas for input validation and response types
├── formatters.ts  # Response formatting functions for MCP-compatible output
├── transport.ts   # Stdio and SSE transport setup
└── utils.ts       # Utility functions (ISO date validation)
```

### Request Flow
1. Tool receives request → Zod schema validates input
2. `GitLabApi` method makes authenticated HTTP call with Bearer token
3. Response validated with Zod schema
4. Formatter creates MCP response with text content blocks

### Key Patterns
- **API Client**: All GitLab calls go through `GitLabApi` class with `encodeURIComponent` for project IDs/paths
- **Read-Only Mode**: `GITLAB_READ_ONLY_MODE=true` filters tools by `readOnly: boolean` flag
- **Dual Transport**: Stdio (default) or SSE (`USE_SSE=true`)
- **Pagination**: 1-indexed pages, `per_page` 1-100, total from `X-Total` header

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GITLAB_PERSONAL_ACCESS_TOKEN` | Yes | - | GitLab auth token |
| `GITLAB_API_URL` | No | `https://gitlab.com/api/v4` | API endpoint |
| `USE_SSE` | No | `false` | Enable SSE transport |
| `PORT` | No | `3000` | SSE port |
| `GITLAB_READ_ONLY_MODE` | No | `false` | Read-only mode |

## Development Rules (from ai_code_of_conduct.md)

### Publishing (P0 - Critical)
- **Never** run `npm publish` manually
- Increment version in package.json following semver
- Push to main branch - GitHub Actions handles publishing automatically

### Branch Naming
- `feature/*` for features
- `fix/*` for bug fixes
- `docs/*` for documentation
- `refactor/*` for refactoring

### Commit Messages
Format: `type: description` where type is one of:
- `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- GitHub Actions auto-updates CHANGELOG.md from commit prefixes

### Code Standards
- TypeScript strict mode with explicit types
- No `any` type usage
- camelCase for variables/functions
- PascalCase for classes/interfaces/types
- UPPER_SNAKE_CASE for constants
- JSDoc comments for public APIs with `@param`, `@returns`, `@throws`

### Dependencies
- Use exact versions, not ranges (e.g., `@1.2.3` not `^1.2.3`)
- Test after each update
- Run `npm audit` for security checks
