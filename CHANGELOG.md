# Changelog

All notable changes to `@yoda.digital/gitlab-mcp-server` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

E2E test infrastructure (reincarnation of #63 by @ecthelion77, Olivier Gintrand) plus three pre-existing schema bugs the suite surfaced on first run against GitLab CE 18.x.

### Added

- **End-to-end test suite** under `e2e/` — 81 tests covering all 86 MCP tools
  against a real GitLab CE container. 76 pass + 5 Premium-only skipped on a
  fresh GitLab volume. Originally proposed in #63 by @ecthelion77; reincarnated
  by maintainer onto current `main` with corrections (see `Internal` below).
- **`.github/workflows/e2e.yml`** — runs the E2E suite after the build workflow
  completes, using a pre-warmed GitLab CE image.
- **`.github/workflows/warm-gitlab.yml`** — weekly pre-warm of a GitLab CE image
  with migrations already applied, cutting E2E boot time from 8-12 min cold to
  ~2 min. Manual `workflow_dispatch` available for ad-hoc rebuilds.
- **`scripts/check-tool-coverage.sh`** — coverage gate wired into `build.yml`
  that fails the build if a new tool is added to `src/index.ts` without a
  corresponding E2E test. Premium-only tools (group wiki) whitelisted.
- **`GITLAB_HOST_PORT` env override** in `e2e/docker-compose.yml` for local
  contributors whose host port 8080 is occupied by other services.

### Fixed

- **`GitLabRepositorySchema` now declares `path_with_namespace` and `path`** —
  present in every `/projects` response from GitLab but Zod was silently
  stripping them, so tool consumers that relied on them (including the
  `search_repositories` E2E test) saw `undefined`. Pre-existing bug on `main`,
  surfaced by the reincarnated suite.
- **`approveMergeRequest` / `unapproveMergeRequest` no longer parse responses
  as full MergeRequest objects** — the `/merge_requests/:iid/approve` and
  `/unapprove` endpoints in GitLab CE return a small approval-state object,
  not the full MR. The old code threw `Invalid arguments: id, iid, ... required`
  on every call. New schema `MergeRequestApprovalStateSchema` parses both
  variants and tolerates the 204 No Content return from CE on unapprove.
- **`WikiPageFormatEnum` accepts `'plaintext'`** — GitLab CE 18.x returns
  `'plaintext'` on wiki pages created via API without an explicit format,
  in addition to the 4 documented values. Enum was rejecting the response.

### Internal

- **Maintainer corrections applied during reincarnation of #63** — node:22-alpine
  digest pin in `e2e/Dockerfile`; `gitlab/gitlab-ce:18.11.3-ce.0` pin in
  docker-compose (was `:latest`); `external_url 'http://gitlab.local'` (nominal
  hostname) so nginx listens on container port 80 matching the port mapping;
  `monitoring_whitelist = ['0.0.0.0/0', '::/0']` so host-side
  `wait-for-gitlab.sh` can poll `/-/readiness` through the docker bridge;
  `FIXTURES_DIR` default changed from absolute `/app/fixtures` to relative
  `./fixtures` so host runs work; `ToolResult` type narrowed from `any` to a
  shaped optional-content union; coverage-script regex tightened to `.callTool(`
  context to eliminate 5 false positives; `.dockerignore` added; `warm-gitlab.yml`
  permissions and `:latest` push gating hardened. Full per-commit detail on the
  reincarnation PR.

### Documentation

- **`docs/OPERATIONS.md`** gained two operational runbooks:
  "Release atomicity & recovery" (closes #47) covering the independent
  failure modes of `build.yml` and `publish.yml` plus `gh CLI` recovery
  commands for each asymmetric case, and "First-publish runbook: ghcr.io
  package" (closes #51) covering the one-time visibility/Actions-access
  setup for a freshly created container package on GitHub.
- **`CONTRIBUTING.md`** gained a "🎯 Release ceremony" section (closes #49)
  documenting the release-driven publish model (since #43): when to cut a
  release, the 8-step maintainer procedure, and the anti-patterns (no
  manual `npm publish`, no amends to published releases, no CHANGELOG
  rewrites).
- **`CLAUDE.md`** test note refreshed to mention the new `e2e/` suite +
  coverage gate, and to list all current unit test files.

### Credits

- E2E suite design and ~80% of the implementation: @ecthelion77 (Olivier Gintrand).
  Cherry-picked with authorship preserved on each of his 5 commits; the squash
  merge to `main` carries a `Co-authored-by:` trailer.

## [0.7.2] - 2026-05-18

Wiki upload + PAT-mode concurrency fixes. Carries the two contributions from #62 (Olivier Gintrand) with maintainer-side corrections: an explicit `content_encoding` parameter for binary uploads, a schema fallback for older self-hosted GitLab, and regression tests for both fixes.

### Fixed

- **Wiki attachment upload uses `multipart/form-data`** — the `upload_project_wiki_attachment`
  and `upload_group_wiki_attachment` tools previously sent JSON with base64 content,
  causing a 400 from GitLab on every call. Now uses `FormData` + `Blob` as required
  by the [GitLab wiki attachments API](https://docs.gitlab.com/api/wikis/#upload-an-attachment-to-the-wiki).
  Originally from #62 by @ecthelion77.
- **Per-session server factory in PAT + streamable-http mode** — a single shared
  `Server` instance across streamable-http sessions raised
  `"Already connected to a transport"` on the second concurrent client and crashed
  the process. The `serverFactory` closure pattern (already used for OAuth) is now
  applied to PAT mode when `USE_SSE` or `USE_STREAMABLE_HTTP` is set, so each
  session gets its own `Server`. Originally from #62 by @ecthelion77.

### Added

- **`content_encoding` parameter on wiki upload tools** — `'utf8'` (default,
  current behaviour: content treated as raw text/bytes) or `'base64'` (decoded
  before upload, required for binary files since MCP parameters are JSON strings).
  No automatic detection: false positives on alphanumeric text would silently
  corrupt uploads.

### Changed

- **`GitLabWikiAttachment` MCP response shape** — the formatted tool output
  now exposes `{url, markdown}` (sourced from the modern API's `link` object).
  The previous `commit_id` field is no longer surfaced. Downstream LLM consumers
  parsing this output should update accordingly.

### Compatibility

- **Older self-hosted GitLab versions** that return the legacy flat
  `{commit_id, url}` shape are still parsed correctly. `GitLabWikiAttachmentSchema`
  accepts either the modern `link.{url, markdown}` envelope or the flat legacy
  fields; the formatter normalises into a single output shape with a synthesised
  markdown snippet on legacy paths.

## [0.7.1] - 2026-05-18

Security + schema-correctness release. Closes all six open Dependabot alerts and a production-breaker for GitLab EE users.

### Security

- **`fast-uri` 3.1.0 → 3.1.2 (#65)** — closes [GHSA-q3j6-qgpj-74h6](https://github.com/advisories/GHSA-q3j6-qgpj-74h6) (path traversal, HIGH) and [GHSA-v39h-62p7-jpjc](https://github.com/advisories/GHSA-v39h-62p7-jpjc) (host confusion, HIGH).
- **`hono` 4.12.16 → 4.12.18 (#66)** — closes [GHSA-qp7p-654g-cw7p](https://github.com/advisories/GHSA-qp7p-654g-cw7p) (CSS injection JSX SSR), [GHSA-p77w-8qqv-26rm](https://github.com/advisories/GHSA-p77w-8qqv-26rm) (Cache Vary leak), and [GHSA-hm8q-7f3q-5f36](https://github.com/advisories/GHSA-hm8q-7f3q-5f36) (JWT NumericDate).
- **Override `ip-address` to 10.1.1 (#78)** — closes [GHSA-v2v4-37r5-5v8g](https://github.com/advisories/GHSA-v2v4-37r5-5v8g) (XSS in `Address6`, moderate). Pulled transitively via `@modelcontextprotocol/sdk → express-rate-limit → ip-address` and not auto-fixable by Dependabot until `express-rate-limit` re-pins it.

### Fixed

- **`avatar_url` schema validation against GitLab EE (#74, #77)** — `GitLabUserSchema` and `GitLabMemberSchema` now accept `null` for `avatar_url`. The GitLab API docs declare it as `string`, but GitLab EE 17.5.5 returns `null` for users without a custom avatar (gitlab.com synthesizes a Gravatar URL so the issue is SaaS-invisible). Without this fix, `GetMergeRequestChanges`, `list_merge_request_notes`, and `list_merge_request_discussions` throw `Invalid arguments: author.avatar_url: Expected string, received null` on every call against EE. Added regression tests covering null, string, and undefined `avatar_url` paths.
- **Revert accidental `mempalace.yaml` from main (#76)** — personal MemPalace plugin state landed at `165ea06`; the release-driven publish model (#43) prevented npm pollution. The revert also adds `mempalace.yaml`, `.mempalace/`, and `entities.json` to `.gitignore` to prevent recurrence.

### Changed

- **`hadolint/hadolint-action` 3.1.0 → 3.3.0 (#68)** — CI minor bump.
- **`@types/node` 20.19.39 → 20.19.41, `vitest` 4.1.5 → 4.1.6 (#75)** — dev deps minor-patch group.

## [0.7.0] - 2026-05-06

### Added

- **CI: negative tests for chart fail-loud guards (#48)** — the `validate`
  job now runs `helm template` with six deliberately broken value sets and
  asserts each guard fires (non-zero exit + expected error substring).
  Includes the new `auth-validation.yaml` guard from #58 (GHSA-8jr5-6gvj-rfpf).
- `chart/values.yaml` documentation comment block listing all six guards,
  their source template, and the CI-matched error substring.
- **Dockerfile: `HEALTHCHECK` directive** — plain Docker / Compose / Swarm
  deployments now get built-in liveness via `wget /healthz`.
- **Helm chart: `image.digest` support** — `values.yaml` + schema +
  deployment template accept an optional `image.digest` field that takes
  precedence over `image.tag` when set.
- **`/livez` endpoint** — always returns `200 {"status":"ok"}` regardless of
  session count. Intended for Kubernetes `livenessProbe`.
- **`/readyz` endpoint** — returns 503 when session count exceeds
  `HEALTHZ_MAX_SESSIONS`. Intended for Kubernetes `readinessProbe`.

### Changed

- **Dockerfile: digest-pin base image** — both `FROM node:24-alpine` stages
  now use `@sha256:…` digest pinning. Dependabot `docker` ecosystem (already
  configured) keeps the pin current automatically.
- **Dockerfile: `COPY --chown=node:node`** — replaces the `RUN chown -R`
  layer with native BuildKit ownership. `USER node` is set before `npm ci`
  so `node_modules/` are owned by `node:node` by construction.
- **Dockerfile: `HEALTHCHECK --start-period` bumped to 10s** — accommodates
  cold-start on constrained pods (`resources.requests.cpu: 50m`).
- **Helm chart probe defaults** — `probes.liveness.path` now defaults to
  `/livez`, `probes.readiness.path` to `/readyz`.

### Deprecated

- **`/healthz`** — retained as alias of `/readyz` for backward compatibility.
  Will be removed in 0.8.0. Note: the alias inherits the new `>=` threshold
  semantic from `/readyz` (was `>` in 0.6.0). An operator at exactly
  `HEALTHZ_MAX_SESSIONS` sessions now sees 503 where 0.6.0 returned 200.

## [0.6.0] - 2026-05-05

Security release. Closes [GHSA-8jr5-6gvj-rfpf](https://github.com/yoda-digital/mcp-gitlab-server/security/advisories/GHSA-8jr5-6gvj-rfpf) — SSE / Streamable HTTP transports were unauthenticated in default (PAT) mode and bound to all interfaces, exposing all 86 GitLab tools (including write tools) to anyone reachable on the bind. Reported privately by [@dodge1218](https://github.com/dodge1218).

### Breaking changes

- **`HOST` defaults to `127.0.0.1`** (loopback only) for HTTP transports. Set `HOST=0.0.0.0` (or a specific interface) to expose to the network — but only with `AUTH_MODE=oauth`, otherwise startup refuses.
- **`AUTH_MODE=pat` + non-loopback bind is refused at startup.** The server exits with a fatal error naming the env vars to set. Either bind loopback for local dev, or switch to OAuth mode for shared deployments.
- **Helm chart `config.AUTH_MODE` default flipped from `pat` to `oauth`.** Pods are reachable via the Kubernetes Service, which is cluster-reachable by design — PAT mode in Helm was the documented vulnerable configuration. A new `chart/templates/auth-validation.yaml` guard refuses install when `AUTH_MODE=pat` is combined with a non-loopback `HOST`.
- **Wildcard `Access-Control-Allow-Origin: *` is no longer emitted on non-loopback binds**, regardless of `AUTH_MODE`. Network-exposed deployments must set `CORS_ALLOW_ORIGINS` explicitly.

### Security

- **Sessions bound to originating Bearer (CWE-287).** OAuth-mode sessions store the SHA-256 hash of the `Authorization: Bearer` that opened them. Every subsequent request reusing the `MCP-Session-Id` (or SSE `sessionId` query param) must present the same Bearer; a leaked sessionId without the original token is rejected with 401. Comparison uses `crypto.timingSafeEqual` to prevent a timing-oracle attack against the stored hash.
- **Defense-in-depth: `setupTransport` itself refuses to start an unsafe combination**, even if a caller bypasses the `index.ts` startup guard. Same check, two layers.
- **Loopback detection covers the full IPv4 `127.0.0.0/8` range** (not just `127.0.0.1`), plus `::1`, `::ffff:127.x.y.z`, and case-insensitive `localhost`. Operators who pick a non-`127.0.0.1` loopback address for port-conflict reasons are still safe; the safety guard correctly identifies them as loopback.
- **CORS-on-loopback-only.** Wildcard origin is permitted only when bind is loopback AND `AUTH_MODE=pat` AND `CORS_ALLOW_ORIGINS` is empty. Any other configuration requires an explicit allowlist.

### Added

- New `HOST` environment variable (default `127.0.0.1`).
- New `chart/templates/auth-validation.yaml` fail-loud guard.
- New exported helpers in `src/transport.ts`: `isLoopbackHost(host)`, `requireSafeTransportConfig({useSSE, useStreamableHttp, host, authMode})`.
- New `## Threat model — auth × bind matrix` section in `SECURITY.md`.
- Tests covering startup-config refusal, sessionId-Bearer binding rejection (wrong Bearer, no Bearer), and the `setupTransport` defense-in-depth path.

### Migration

- **Local stdio clients (Claude Desktop, Cursor, Zed):** no change. Stdio is unaffected.
- **Local HTTP for development:** no change if you bind loopback (the new default). If your previous setup relied on `0.0.0.0` for cross-machine local-dev access, set `HOST=127.0.0.1` (default) for single-machine, or switch to `AUTH_MODE=oauth` and front it with a gateway.
- **Docker `docker run -p 3000:3000`:** the in-container bind defaults to `127.0.0.1`, which is not reachable through the port mapping. Set `HOST=0.0.0.0` *and* `AUTH_MODE=oauth`. Update your client URLs to go through your gateway.
- **Helm `helm install`:** the chart defaults to `AUTH_MODE=oauth` and `HOST=0.0.0.0`. If you were depending on the previous PAT default, the chart's auth-validation guard will refuse install — set `config.AUTH_MODE=oauth` and front the Service with an Ingress that injects `Authorization: Bearer`.

### Credits

[@dodge1218](https://github.com/dodge1218) for the responsible disclosure, the reproducible PoC, the CWE mapping, and the design conversation on the patch shape.

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
