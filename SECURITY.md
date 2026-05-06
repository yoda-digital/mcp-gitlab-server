# Security policy

## Reporting a vulnerability

Report security vulnerabilities **privately** via GitHub's
[private vulnerability reporting](https://github.com/yoda-digital/mcp-gitlab-server/security/advisories/new),
**not** through public issues.

Expected response time: best-effort within 7 days. Coordinated disclosure
preferred.

## Threat model — auth × bind matrix

The HTTP transports (`USE_SSE`, `USE_STREAMABLE_HTTP`) carry no
authentication of their own in `AUTH_MODE=pat`. The server's safety
properties are a function of two axes:

| `AUTH_MODE` | `HOST` (bind) | Outcome |
|---|---|---|
| `pat` | `127.0.0.0/8` IP literal (loopback) | OK for single-tenant local dev. Wildcard CORS permitted. No network exposure. |
| `pat` | non-loopback | **Refused at startup.** Unauthenticated network exposure of a PAT-backed GitLab tool surface (CWE-306). |
| `oauth` | `127.0.0.1` (loopback) | OK. `Authorization: Bearer` required on every request. |
| `oauth` | non-loopback | OK for shared deployments. Front with a gateway that handles your IdP and injects `Authorization: Bearer`. |

The Helm chart defaults to `AUTH_MODE=oauth` because a Kubernetes
Service is by definition cluster-reachable, which means non-loopback
bind. A chart-level `{{ fail }}` guard refuses install if PAT mode is
combined with a network-exposed `HOST`.

OAuth-mode sessions are bound to the SHA-256 hash of their originating
`Authorization: Bearer` header; a leaked `MCP-Session-Id` without the
original Bearer is rejected with 401.

CORS: the wildcard `Access-Control-Allow-Origin: *` is emitted only on
the loopback-PAT-empty-allowlist combination. Network-exposed binds
require an explicit `CORS_ALLOW_ORIGINS` allowlist; otherwise no
`Allow-Origin` header is set and browsers refuse cross-origin reads.

Note on hostnames: the loopback check accepts the literal name
`localhost` (case-insensitive) but does **not** resolve it through
DNS or `/etc/hosts`. For hardening configurations, prefer the IP
literal `127.0.0.1` — the literal can't be redirected by a hosts-file
mistake or a downstream resolver to a non-loopback address.

## Scope

This server connects to a GitLab instance using a personal access token
or OAuth token supplied by the operator and exposes the GitLab API over MCP.
The threat model includes:

- **Token misuse / leak** — the access token has whatever scope the operator
  grants it. Run with the minimum scopes you need (`read_api` for read-only
  use; full `api` only when write tools are required). Never check tokens
  into version control, log them, or paste them into bug reports.
- **Read-only mode bypass** — the `READ_ONLY_MODE=true` flag must reject every
  mutating call. A regression that lets a write tool execute under read-only
  mode is a security bug — please report it.
- **SSRF / endpoint forgery** — `GITLAB_API_URL` is operator-configurable.
  Pointing it at an attacker-controlled host turns the server into an oracle
  for the configured token. Validate the URL before deployment.
- **Stream corruption** — when running over stdio, anything writing to
  stdout outside the MCP protocol stream is a bug; reports of such regressions
  are treated as security issues because they can desynchronize a client.
- **Dependency CVEs** — high-severity transitive vulnerabilities reported by
  `npm audit` or by Dependabot are addressed in the next patch release.

## Out of scope

- Vulnerabilities in your GitLab instance itself.
- Issues that require local filesystem write access on the host running the
  server.
- The behavior of any third-party MCP client (Claude Desktop, Cursor, Zed,
  VS Code) — those have their own security policies.

## Public disclosure

Once a fix is merged and a release is cut, we publish a CVE through GitHub
Security Advisories where applicable.

## Listed at

[opensource.yoda.digital/projects/mcp-gitlab-server/](https://opensource.yoda.digital/projects/mcp-gitlab-server/)
