# Security policy

## Reporting a vulnerability

Report security vulnerabilities **privately** via GitHub's
[private vulnerability reporting](https://github.com/yoda-digital/mcp-gitlab-server/security/advisories/new),
**not** through public issues.

Expected response time: best-effort within 7 days. Coordinated disclosure
preferred.

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
