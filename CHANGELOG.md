# Changelog

All notable changes to `@yoda.digital/gitlab-mcp-server` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet. New entries land here between releases._

## [0.3.1] - 2026-05-02

### Fixed

- `list_issues` silently dropped issue IIDs past the first page of results;
  pagination now returns the full set across pages (#24).
- Documentation: corrected `GITLAB_URL` references in README and
  `CONTRIBUTING.md` — the actual environment variable is `GITLAB_API_URL`.

### Security

- Patched transitive npm vulnerabilities in `ajv`, `hono`, and `rollup`
  reported by `npm audit`. No exploit known in this server's usage path,
  but tracked dependencies must stay clean.

### Changed

- `.mcp.json` added to `.gitignore` so accidental client config files are
  not committed.
- README: named competitor table for clearer positioning; onboarding path
  fixed (#21).
- API reference documentation expanded for core tools (#20).
- Removed marketing language; the README now reflects the 86 real MCP tools
  the server actually exposes (#19).

## [0.3.0] - earlier

Prior history retained in git. From 0.3.1 onward, every release ships a
matching CHANGELOG entry alongside the version bump.

## Listed at

[opensource.yoda.digital/projects/mcp-gitlab-server/](https://opensource.yoda.digital/projects/mcp-gitlab-server/)
