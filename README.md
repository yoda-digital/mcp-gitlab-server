# GitLab MCP Server

<p align="center">
  <img src="./assets/repo-logo.png" alt="GitLab MCP Server Logo" width="200">
</p>

<p align="center">
  <a href="https://opensource.yoda.digital/en/projects/mcp-gitlab-server/">
    <img alt="Listed on Yoda Digital Open Source" src="https://img.shields.io/badge/listed%20on-opensource.yoda.digital-af9568?style=flat-square">
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@yoda.digital/gitlab-mcp-server">
    <img alt="npm version" src="https://img.shields.io/npm/v/@yoda.digital/gitlab-mcp-server?color=blue">
  </a>
  <a href="https://www.npmjs.com/package/@yoda.digital/gitlab-mcp-server">
    <img alt="npm downloads" src="https://img.shields.io/npm/dt/@yoda.digital/gitlab-mcp-server">
  </a>
  <a href="https://github.com/yoda-digital/mcp-gitlab-server/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/yoda-digital/mcp-gitlab-server?style=social">
  </a>
  <a href="https://github.com/yoda-digital/mcp-gitlab-server/commits/main">
    <img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/yoda-digital/mcp-gitlab-server">
  </a>
  <a href="https://github.com/yoda-digital/mcp-gitlab-server/blob/main/LICENSE">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg">
  </a>
  <a href="https://github.com/yoda-digital/mcp-gitlab-server/issues">
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/yoda-digital/mcp-gitlab-server">
  </a>
  <a href="https://github.com/yoda-digital/mcp-gitlab-server/pulls">
    <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/yoda-digital/mcp-gitlab-server">
  </a>
</p>

<p align="center">
  <b>The most comprehensive Model Context Protocol (MCP) server for GitLab — 86 tools, enterprise-ready, actively maintained.</b>
</p>

---

## What it is

GitLab MCP Server lets an AI agent (Claude Desktop, Claude Code, Cursor, Zed, VS Code, or any [Model Context Protocol](https://modelcontextprotocol.io) client) talk directly to GitLab. It is a typed, paginated, schema-validated bridge to the GitLab REST API, exposed as 86 MCP tools. It is not a wrapper around `glab` and it does not screen-scrape.

It runs against `gitlab.com` or any self-hosted GitLab instance, and authenticates with a personal access token, an OAuth Bearer token forwarded by an upstream gateway, or a read-only token for safe demos.

---

## Why it exists

Anthropic released MCP on November 25, 2024. The reference servers covered Google Drive, Slack, GitHub, Git, Postgres, and Puppeteer. There was no GitLab server. The Yoda Digital engineering team runs on self-hosted GitLab, so the official examples did not help us, and the early community ports were not yet trying to cover the GitLab surface area properly.

We wrote one for ourselves. Group projects, activity tracking, the operations our DevOps actually needed. We open-sourced it on March 18, 2025, expecting maybe five people to find it useful.

A year on the project has 86 tools, working stdio / SSE / Streamable HTTP transports, PAT and OAuth modes, a Docker image on ghcr.io, and a Helm chart written almost entirely by an external contributor we had never met. Releases 0.4.0 and 0.5.0 are mostly someone else's code now, which is the best problem an open-source maintainer can have.

---

## Quick start

### Local clients (stdio)

For Claude Desktop, Cursor, Zed, and any client that runs MCP servers as a local subprocess. Add this to your client's MCP config (for Claude Desktop, that's `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["-y", "@yoda.digital/gitlab-mcp-server"],
      "env": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "glpat-…",
        "GITLAB_API_URL": "https://gitlab.com/api/v4"
      }
    }
  }
}
```

Self-hosted? Replace `GITLAB_API_URL` with your instance, e.g. `https://gitlab.example.com/api/v4`. Want a safe demo with no write access? Add `"GITLAB_READ_ONLY_MODE": "true"`. Per-IDE notes are in [`docs/CURSOR_INTEGRATION.md`](./docs/CURSOR_INTEGRATION.md).

### Remote (Streamable HTTP)

For shared deployments and modern remote MCP clients, run the server as an HTTP service:

```bash
docker run --rm -p 3000:3000 \
  -e GITLAB_PERSONAL_ACCESS_TOKEN=glpat-… \
  -e USE_STREAMABLE_HTTP=true \
  ghcr.io/yoda-digital/mcp-gitlab-server:latest
```

Then point clients at `http://localhost:3000/mcp`. For per-connection OAuth, where each user supplies their own Bearer token, set `AUTH_MODE=oauth` and front the server with a gateway that injects `Authorization: Bearer <token>`.

Operational details, probe configuration, and troubleshooting are in [`docs/OPERATIONS.md`](./docs/OPERATIONS.md).

---

## What's in the box

86 tools, grouped by surface:

- Repositories: search, create, fork, get and update project metadata.
- Files and branches: read, create, update, and delete files; multi-file commits; branches (list, create, delete); repository tree.
- Tags and releases: list and create tags; list and create releases.
- Issues: create, list, update, notes, threaded discussions.
- Merge requests: create, update, merge, rebase; approvals; auto-merge; notes, discussions, changes, commits.
- CI/CD: pipelines (list, get, trigger, retry, cancel), jobs (list, get, log, retry, cancel), environments.
- Wikis: project and group wikis, including attachments.
- Groups and members: groups CRUD, subgroups, project and group members.
- Labels and milestones: list, create, update; protected branches: list, protect, unprotect.
- Users and meta: current user, list/get user, project events, commit history.

Full tool list in [`CLAUDE.md`](./CLAUDE.md). Per-tool docs for selected tools in [`docs/api/`](./docs/api/).

Read-only mode (`GITLAB_READ_ONLY_MODE=true`) filters every mutating tool out at registration time. A misbehaving agent cannot see them, let alone call them.

---

## Transports

| Transport | When to use | Flag |
|---|---|---|
| stdio | Local clients (Claude Desktop, Cursor, Zed). The default. | _(default)_ |
| SSE | Remote clients still on the legacy SSE spec. | `USE_SSE=true` |
| Streamable HTTP | Remote clients on the current MCP Streamable HTTP spec. | `USE_STREAMABLE_HTTP=true` |

Streamable HTTP runs `POST /mcp`, `GET /mcp`, and `DELETE /mcp`, with session management via the `MCP-Session-Id` header. The `/healthz` endpoint returns 503 when active sessions exceed `HEALTHZ_MAX_SESSIONS`, intended for Kubernetes liveness and readiness probes.

---

## Authentication

Two modes. Pick the one that matches your deployment.

PAT mode (the default). The server holds one personal access token in `GITLAB_PERSONAL_ACCESS_TOKEN`. Simple, and the right choice for almost everyone running this locally or as a single-tenant service.

OAuth per connection (`AUTH_MODE=oauth`). The server holds nothing. Every MCP connection brings its own `Authorization: Bearer <token>`, which the server forwards to GitLab. Run it behind a gateway that handles your IdP. This is how you operate one shared deployment for an entire team.

---

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `GITLAB_PERSONAL_ACCESS_TOKEN` | — | Required in PAT mode. |
| `GITLAB_API_URL` | `https://gitlab.com/api/v4` | GitLab API base URL. Point at your self-hosted instance if needed. |
| `GITLAB_READ_ONLY_MODE` | `false` | Hide all write tools. |
| `AUTH_MODE` | `pat` | `pat` or `oauth`. |
| `USE_SSE` | `false` | Enable legacy SSE transport. |
| `USE_STREAMABLE_HTTP` | `false` | Enable MCP Streamable HTTP transport. |
| `PORT` | `3000` | HTTP listen port for SSE and Streamable HTTP. |
| `CORS_ALLOW_ORIGINS` | _(empty)_ | Comma-separated allowlist. Empty means `*` in PAT mode and deny in OAuth mode. |
| `HEALTHZ_MAX_SESSIONS` | `10000` | `/healthz` flips to 503 above this threshold. |

`.env.example` ships in the repo for local development.

---

## Deployment

### Docker

```
ghcr.io/yoda-digital/mcp-gitlab-server:latest
```

Multi-stage build on `node:24-alpine`. Runs as non-root (uid 1000) with all capabilities dropped. Compatible with read-only root filesystems and the `seccompProfile: RuntimeDefault` Kubernetes pod-security setting. Image tags follow semver on releases; `latest` tracks the most recent tagged release.

### Kubernetes (Helm)

```bash
helm install gitlab-mcp oci://ghcr.io/yoda-digital/charts/gitlab-mcp \
  --set secret.GITLAB_PERSONAL_ACCESS_TOKEN=glpat-…
```

The chart ships liveness and readiness probes against `/healthz`, an optional `PodDisruptionBudget`, ConfigMap and Secret with rolling-restart annotations, and four fail-loud guards that refuse to render bad configurations:

- empty PAT in PAT mode without `existingSecret`
- both `existingSecret` and inline `secret.GITLAB_PERSONAL_ACCESS_TOKEN` set (a silent precedence trap, otherwise)
- `PDB minAvailable >= replicaCount` (drain deadlock)
- both `minAvailable` and `maxUnavailable` set on the PDB (Kubernetes rejects this combination at admission)

`values.yaml` is annotated for `helm-docs`, and `chart/README.md` is regenerated and drift-checked in CI.

---

## Security

Vulnerabilities go through GitHub's [Private Vulnerability Reporting](https://github.com/yoda-digital/mcp-gitlab-server/security/advisories/new), not public issues. Threat model and scope are in [`SECURITY.md`](./SECURITY.md).

A few things that are true about the supply chain. Every npm publish is signed with [Sigstore provenance](https://docs.npmjs.com/generating-provenance-statements) via OIDC Trusted Publishing. CodeQL runs on every push and PR with the `security-extended` and `security-and-quality` query packs. Dependabot is on, grouped, and weekly. `npm audit` reports zero vulnerabilities at the current release. `main` requires PRs, status checks, squash or rebase merges, and linear history.

Read-only mode is enforced at tool registration, not at the request boundary. If a regression lets a write tool execute under `GITLAB_READ_ONLY_MODE=true`, that is a security bug. Please report it.

---

## Where this fits in the ecosystem

There are several ways to combine GitLab and MCP. Pick the one that matches your situation:

- **GitLab's own built-in MCP server** at `https://<your-instance>/api/v4/mcp`. 15 tools, requires GitLab Premium or Ultimate, OAuth integrated with your GitLab IdP. The right choice if you have the subscription and 15 tools is enough surface area for your agents.
- **[`zereight/gitlab-mcp`](https://github.com/zereight/gitlab-mcp)**, the largest community implementation. Broader auth surface (PAT, OAuth2 browser flow, OAuth proxy, remote authorization), more tools. A good fit if you want maximum coverage and do not mind a larger project to reason about.
- **[`mcpland/gitlab-mcp`](https://github.com/mcpland/gitlab-mcp)**, with a policy-engine focus. OAuth2 PKCE, multi-instance routing, cookie-based auth. Good for tightly controlled enterprise deployments.
- **This server (`@yoda.digital/gitlab-mcp-server`)**. 86 tools, three transports, PAT and OAuth, Sigstore-provenanced npm releases, a non-root multi-stage Docker image, and a Helm chart with fail-loud guards. Good if you want a smaller, security-mature project that lands cleanly into a Kubernetes deployment.

None of these is universally best, and we will not pretend otherwise.

---

## Contributing

PRs welcome. The shape we ask for:

1. Fork, branch (`feature/*`, `fix/*`, `docs/*`, `refactor/*`).
2. Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, …). They drive the changelog.
3. Add or update vitest tests for behavior changes. `npm test` is the gate.
4. Open a PR. CI runs `build-and-test`, CodeQL, Dockerfile lint, Helm lint and template smoke test, and a Helm chart README drift check.

Local setup:

```bash
git clone https://github.com/yoda-digital/mcp-gitlab-server.git
cd mcp-gitlab-server
npm install
npm test
npm run dev
```

Full guidelines are in [`CONTRIBUTING.md`](./CONTRIBUTING.md). AI-assisted contribution rules are in [`ai_code_of_conduct.md`](./ai_code_of_conduct.md). Code of Conduct: [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md). A few `good first issue` tickets live in the issue tracker.

---

## Contributors

This project has more authors than its origin suggests.

[Ion (Nalyk) Calmîș](https://github.com/nalyk) is the original author and maintainer. CTO at Yoda Digital.

[Olivier Gintrand (@ecthelion77)](https://github.com/ecthelion77) wrote the OAuth per-connection authentication path, the MCP Streamable HTTP transport, the multi-stage Dockerfile, and the Helm chart, including the fail-loud guards. Releases 0.4.0 and 0.5.0 are mostly his work, merged via PR #42 and PR #44.

[Thomas Léveil (@thomasleveil)](https://github.com/thomasleveil) and [BenSchoweCONPORT](https://github.com/BenSchoweCONPORT) sent early PRs.

Dependabot is responsible for most of the chore commits in the changelog and never sleeps.

If you have sent a PR or a security report and you are not on this list, that is a bug. Please open an issue.

---

## License

[MIT](./LICENSE).

---

## Links

- [npm package](https://www.npmjs.com/package/@yoda.digital/gitlab-mcp-server)
- [Yoda Digital open-source portal](https://opensource.yoda.digital/en/projects/mcp-gitlab-server/)
- [Changelog](./CHANGELOG.md)
- [Operations guide](./docs/OPERATIONS.md)
- [Cursor integration](./docs/CURSOR_INTEGRATION.md)
- [Security policy](./SECURITY.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [MCP specification](https://modelcontextprotocol.io)

---

**Built with ❤️ by [Yoda.Digital](https://yoda.digital)**
