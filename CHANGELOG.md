# Changelog

All notable changes to `@yoda.digital/gitlab-mcp-server` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet. New entries land here between releases._

## [0.5.1] - 2026-05-05

Documentation patch release. No functional code changes from 0.5.0; the
npm package republishes solely to refresh the README displayed on the
npm package page (npm freezes the README to whatever ships in the
publish tarball, so an updated README requires a new version).

### Documentation

- **README rewrite (#54)** — replaces the 0.3-era marketing-style README.
  New version covers what shipped in 0.4.0 / 0.5.0: 86 tools, three
  transports (stdio / SSE / Streamable HTTP), PAT and OAuth modes,
  Docker plus Helm with fail-loud guards, supply-chain posture, and
  contributor credits for PR #42 and PR #44.
- **Tool-surface accuracy** — bullets aligned with current `src/index.ts`:
  dropped `archive` (no such tool); corrected CRUD claims for issues,
  labels, milestones, and protected branches.
- **Doc layout** — `CURSOR_INTEGRATION.md` moved to `docs/` (links
  updated); removed `README-old.md`, `AGENTS.md`, and `tools/`.

## [0.5.0] - 2026-05-04

A packaging and operations release: container image, Helm chart, and
container CI/CD pipeline for `ghcr.io`. Backward compatible — runtime
behavior is identical to 0.4.0; this release adds deployment substrate.

### Added

- **Dockerfile** — multi-stage production build (`node:24-alpine`), non-root
  user (uid 1000), read-only root filesystem compatible (writable `/tmp`
  emptyDir mount), drop-ALL capabilities, `seccompProfile: RuntimeDefault`.
- **Helm chart** (`chart/`) — Kubernetes-ready deployment with ConfigMap,
  Secret (or `existingSecret` reference), Service, ServiceAccount, optional
  PodDisruptionBudget, and liveness/readiness probes against `/healthz`.
  - **Five fail-loud chart guards**: empty PAT in PAT mode without
    `existingSecret`; `existingSecret` AND inline `secret.GITLAB_PERSONAL_ACCESS_TOKEN`
    both set (silent precedence trap); PDB `minAvailable >= replicaCount`
    (drain deadlock); PDB both `minAvailable` AND `maxUnavailable` set
    (K8s-rejected); `AUTH_MODE` invalid value at server startup.
  - All v0.4.0 transport env vars wired in `values.yaml`: `AUTH_MODE`,
    `USE_STREAMABLE_HTTP`, `CORS_ALLOW_ORIGINS`, `HEALTHZ_MAX_SESSIONS`.
  - `checksum/config` and `checksum/secret` deployment annotations roll
    pods on ConfigMap/Secret value changes.
- **`.github/workflows/build.yml`** — three-job CI pipeline:
  - `validate` (every PR + push): hadolint on Dockerfile, `helm lint`,
    `helm template` smoke test.
  - `docker` (push to main + tags only): builds and pushes to
    `ghcr.io/<owner>/<repo>` via `docker/metadata-action@v5` —
    `sha-<short>` on main pushes, `<semver>` + `:latest` on tag pushes only.
  - `helm` (tag pushes only): packages chart with `helm package --version`
    and pushes to `oci://ghcr.io/yoda-digital/charts`. Chart version is
    set by `yq` with post-mutation assertion (replaces fragile `sed -i`).
- Branch protection ruleset updated to require the new `validate` status
  check on PRs (in addition to `build-and-test` + `Analyze (javascript-typescript)`).

### Credits

Implementation work by [@ecthelion77](https://github.com/ecthelion77)
(Olivier Gintrand). Maintainer rebase fixup with two additional fail-loud
guards (silent secret precedence + PDB exclusivity) by
[@nalyk](https://github.com/nalyk). Reviewed via #29 → merged via #44.

## [0.4.0] - 2026-05-04

A feature release adding OAuth per-connection authentication and the MCP
Streamable HTTP transport. Backward compatible: PAT mode and stdio/SSE
transports continue to work unchanged.

### Added

- **OAuth per-connection authentication** (`AUTH_MODE=oauth`): new
  `createMcpServer(token)` factory creates isolated Server + GitLabApi
  instances per connection using the Bearer token from the `Authorization`
  header. PAT mode (default) is unchanged.
- **Streamable HTTP transport** (`USE_STREAMABLE_HTTP=true`): implements
  the MCP Streamable HTTP spec on `POST/GET/DELETE /mcp` with session
  management via `MCP-Session-Id` header. Cross-protocol session-id
  collisions and unknown sessions return 400 JSON-RPC errors.
- **CORS origin allowlist** (`CORS_ALLOW_ORIGINS`): restrict allowed
  origins in OAuth mode; permissive `*` default retained for PAT mode only.
  `Vary: Origin` set when echoing matched origin.
- `/healthz` endpoint with active session count and configurable
  threshold (`HEALTHZ_MAX_SESSIONS`, default `10000`); returns `503` with
  `{"status":"unhealthy","reason":"session_limit_exceeded","sessions":<n>}`
  when the threshold is exceeded — meaningful signal for Kubernetes probes
  rather than the prior unconditional `200`.
- `docs/OPERATIONS.md` — operations guide covering health checks,
  Kubernetes probe configuration, environment variables, and troubleshooting.
- `AUTH_MODE` environment variable validated at startup: invalid values
  exit with `process.exit(1)` and a clear message.
- 17 new vitest cases in `src/transport.test.ts` covering Bearer extraction
  (7), Streamable HTTP session lifecycle (3), cross-protocol session
  collision (2), `/healthz` endpoint (2), and CORS origin handling (3).
  Total: 58 vitest cases pass.

### Changed

- `src/transport.ts` reorganized: extracted helpers `getCorsAllowedOrigins`,
  `getAuthModeEnv`, `getSessionServer` for clarity and testability.
- Memory-leak hardening on Streamable HTTP `connect()` failure
  (`initializedSid` capture + best-effort `close()` + idempotent
  `transports[sid] === transport` identity check on cleanup).
- Legacy SSE cleanup is now idempotent and registered on both `req.close`
  and `transport.onclose`; transport map entry created only after a
  successful `connect()`.

### Credits

Implementation work by [@ecthelion77](https://github.com/ecthelion77)
(Olivier Gintrand). Maintainer rebase fixup by
[@nalyk](https://github.com/nalyk). Reviewed via #28 → merged via #42.

## [0.3.2] - 2026-05-04

A pure security and infrastructure release. No runtime API changes; the
server behaves identically to 0.3.1 for its consumers.

### Security

- `npm audit fix` resolved all 14 transitive npm vulnerabilities reported
  against `0.3.1` (`hono`, `@hono/node-server`, `express-rate-limit`,
  `path-to-regexp`, `picomatch`, `postcss`, `vite`). Lockfile-only changes.
- Added `overrides.vite: ^8.0.0` in `package.json` to permanently resolve
  three high-severity `vite` advisories (GHSA-4w7w-66w2-5vf9,
  GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583) that were inherited via the
  `vitest` dev tree. `npm audit` now reports zero vulnerabilities.
- Enabled GitHub Dependabot security updates, secret scanning, and secret
  scanning push protection on the repository.
- Confirmed Private Vulnerability Reporting (PRVR) enabled — disclosure
  channel is https://github.com/yoda-digital/mcp-gitlab-server/security/advisories/new

### Added

- `.github/dependabot.yml` — weekly grouped npm + GitHub Actions + Docker
  update PRs.
- `.github/workflows/codeql.yml` — CodeQL static analysis (security-extended
  + security-and-quality query packs) on push, PR, and weekly schedule.
- `.github/CODEOWNERS` — review routing for high-impact paths.
- `.github/PULL_REQUEST_TEMPLATE.md` — pre-merge checklist anchored to
  `CLAUDE.md` and `ai_code_of_conduct.md`.
- `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml` — issue
  forms scoped to the MCP / GitLab / transport / auth domain. Blank issues
  disabled; security routes to PRVR, questions route to Discussions.
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 with project-specific
  enforcement contact.
- Branch protection ruleset on `main` (id `15919136`): pull request required,
  status checks gated (`build-and-test` + `Analyze (javascript-typescript)`),
  force-push and deletion blocked, linear history required, squash/rebase
  merges only. Repository admins retain bypass for emergency hotfixes.
- GitHub release tags `v0.3.0` and `v0.3.1` for previously published
  versions (the `npm` registry already had them; the GitHub release timeline
  was empty).

### Changed

- `.github/workflows/publish.yml`:
  - `actions/checkout@v3` → `@v6`
  - `actions/setup-node@v3` → `@v6`
  - `node-version` `20.x` → `22.x` (LTS Iron)
  - Enabled `npm test` in the `build-and-test` job (vitest is wired)
  - `npm publish --provenance --access public` — Sigstore-signed npm
    provenance attestations via GitHub OIDC
  - Least-privilege `permissions:` blocks at workflow + job level
- `CLAUDE.md`: corrected the stale "npm test exits with error" note (vitest
  is wired); added a Security paragraph pointing at PRVR and `SECURITY.md`.

### Removed

- `docs/VISION.md` — superseded; product strategy is tracked elsewhere.
- Wiki page `Product-Vision-&-Roadmap.md` — was a duplicate of
  `docs/VISION.md`.

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
