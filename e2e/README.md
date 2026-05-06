# End-to-End Tests

Full MCP protocol-level integration tests for the GitLab MCP Server. Tests
every tool against a real, ephemeral GitLab CE instance — no mocks.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Actions Runner                       │
│                                                              │
│  ┌──────────────┐    MCP/HTTP     ┌──────────────────────┐  │
│  │  E2E Runner  │ ──────────────► │  MCP Server (SUT)    │  │
│  │  (Vitest +   │                 │  node dist/index.js  │  │
│  │   MCP SDK)   │                 └──────────┬───────────┘  │
│  └──────────────┘                            │ GitLab API   │
│                                              ▼              │
│                              ┌───────────────────────────┐  │
│                              │  GitLab CE (pre-warmed)   │  │
│                              │  Ephemeral — fresh state  │  │
│                              └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## CI Pipeline Overview

Three workflows collaborate:

| Workflow | File | Purpose |
|----------|------|---------|
| **Build & Publish** | `build.yml` | Builds MCP + E2E Docker images, validates, pushes to ghcr.io |
| **E2E Tests** | `e2e.yml` | Boots GitLab CE, runs E2E against the built images |
| **Warm GitLab** | `warm-gitlab.yml` | Pre-warms GitLab CE image (weekly + on-demand) |

### Trigger chain

```text
push to main → build.yml (validate + docker) → e2e.yml (auto-triggered via workflow_run)
```

For branches, add `[e2e]` or `[build]` to the commit message to trigger the chain.

### Tool Coverage Gate

`scripts/check-tool-coverage.sh` runs during the `validate` job in `build.yml`.
It extracts all MCP tool case statements from `src/index.ts` and verifies each
tool has at least one call in `e2e/src/tests/`. The build fails immediately if a
tool is added without test coverage.

Premium-only tools (group wiki) are excluded via a whitelist in the script.

## What's Tested

| Domain | Tools | Tests |
|--------|-------|-------|
| Repository | `search_repositories`, `create_repository`, `get_file_contents`, `create_or_update_file`, `push_files`, `get_repository_tree`, `list_commits`, `list_branches`, `create_branch`, `delete_branch`, `compare_branches`, `list_tags`, `create_tag`, `fork_repository` | 12 |
| Issues | `list_issues`, `create_issue`, `update_issue`, `create_issue_note`, `list_issue_notes`, `list_issue_discussions` | 6 |
| Merge Requests | `list_merge_requests`, `create_merge_request`, `update_merge_request`, `get_merge_request_changes`, `get_merge_request_commits`, `approve_merge_request`, `unapprove_merge_request`, `list_merge_request_notes`, `create_merge_request_note`, `update_merge_request_note`, `list_merge_request_discussions`, `create_merge_request_discussion`, `rebase_merge_request`, `merge_merge_request` | 14 |
| Wiki | `list_project_wiki_pages`, `get_project_wiki_page`, `create_project_wiki_page`, `edit_project_wiki_page`, `delete_project_wiki_page`, `list_group_wiki_pages`, `get_group_wiki_page`, `create_group_wiki_page`, `edit_group_wiki_page`, `delete_group_wiki_page` | 10 |
| Pipelines & Jobs | `list_pipelines`, `get_pipeline`, `trigger_pipeline`, `cancel_pipeline`, `list_pipeline_jobs`, `get_job` | 6 |
| Labels & Milestones | `list_labels`, `create_label`, `update_label`, `list_milestones`, `create_milestone`, `update_milestone` | 6 |
| Members | `list_project_members`, `list_group_members` | 2 |
| Users & Groups | `get_current_user`, `list_users`, `get_user`, `list_groups`, `get_group`, `list_group_subgroups`, `create_group`, `update_group`, `delete_group`, `list_group_projects`, `get_project`, `update_project`, `get_project_events` | 13 |
| Branch Protection | `list_protected_branches`, `protect_branch`, `unprotect_branch` | 3 |
| Environments & Releases | `list_environments`, `list_releases`, `create_release` | 3 |

**Total: 81 tests covering all 86 tools** (some tools share test cases via roundtrips; 5 group wiki tests skipped — Premium only).

## Prerequisites

- Node.js 24+
- Docker (for local development with docker-compose)

## Local Development

```bash
# Start GitLab CE (takes ~3 minutes to boot)
docker compose -f e2e/docker-compose.yml up -d gitlab

# Wait for readiness
e2e/src/scripts/wait-for-gitlab.sh

# Install E2E dependencies
cd e2e && npm ci

# Provision test fixtures (creates group, project, issues, MR, wiki, etc.)
export GITLAB_URL=http://localhost:8080
export GITLAB_ROOT_PASSWORD='E2eTestPassword1!'
npm run provision

# Start the MCP server (in another terminal)
export GITLAB_URL=http://localhost:8080
export GITLAB_PERSONAL_ACCESS_TOKEN=$(jq -r .token e2e/fixtures.json)
export USE_STREAMABLE_HTTP=true
npm start

# Run E2E tests
cd e2e
export MCP_SERVER_URL=http://localhost:3000
npm test

# Teardown (optional — deletes test data from GitLab)
npm run teardown
```

## CI Workflow

The E2E tests run automatically via `.github/workflows/e2e.yml`:

1. **Build & Publish** completes (Docker images for MCP server + E2E runner pushed to ghcr.io)
2. **E2E Tests** is triggered via `workflow_run`
3. Gate job decides: main → always, branches → only if commit message contains `[e2e]`
4. Pulls pre-warmed GitLab image (falls back to cold `gitlab/gitlab-ce:latest`)
5. Boots GitLab CE (~2 min warm, ~8-12 min cold)
6. Provisions fixtures via E2E image (`npm run provision`)
7. Starts MCP server container (streamable-http mode, PAT auth)
8. Runs all E2E tests via E2E image (`npm test`)
9. Uploads JUnit XML report as artifact

**No shared runners**: Uses free `ubuntu-latest` — no GitLab.com runners needed.

## Pre-warmed GitLab Image

Cold-booting GitLab CE takes 8-12 minutes (database migrations, service init).
The `warm-gitlab.yml` workflow solves this:

### How it works

1. Boots a cold `gitlab/gitlab-ce:<version>` container
2. Waits for full readiness (`/-/readiness` endpoint)
3. Stops services gracefully (`gitlab-ctl stop`)
4. `docker commit` → saves the initialized state as a new image
5. Pushes to `ghcr.io/<repo>/gitlab-ce-warm:latest` + versioned tag

### Result

The warm image has all migrations applied and services pre-configured.
It boots in **~2 minutes** instead of 8-12. The E2E workflow automatically
uses it (with fallback to cold image if unavailable).

### Rebuild schedule

- **Automatic**: weekly (Sunday 03:00 UTC)
- **Manual**: `workflow_dispatch` with optional `gitlab_version` input
- **When to rebuild**: after bumping the GitLab CE version in docker-compose

### Configuration

The warm image is stored in ghcr.io under the repository's packages:
`ghcr.io/<owner>/<repo>/gitlab-ce-warm:<version>` and `:latest`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GITLAB_URL` | `http://localhost:8080` | GitLab instance URL |
| `GITLAB_ROOT_PASSWORD` | `E2eTestPassword1!` | Root password for provisioning |
| `MCP_SERVER_URL` | `http://localhost:3000` | MCP server endpoint |
| `GITLAB_READY_TIMEOUT` | `300` | Seconds to wait for GitLab boot |

## Docker Image (for external use)

The E2E runner is packaged as a standalone Docker image for use in other CI
systems (e.g., Kargo analysis templates):

```bash
docker build -t gitlab-mcp-e2e:latest -f e2e/Dockerfile .

docker run --rm \
  -e GITLAB_URL=https://my-gitlab.example.com \
  -e GITLAB_TOKEN=glpat-xxxx \
  -e MCP_SERVER_URL=http://mcp-server:3000 \
  gitlab-mcp-e2e:latest
```

## Design Decisions

1. **Real MCP protocol** — Tests use `@modelcontextprotocol/sdk` Client with `StreamableHTTPClientTransport`. No HTTP shortcuts.
2. **No mocks** — Every test hits the real GitLab API through the MCP server. Catches serialization bugs, schema mismatches, and API version regressions.
3. **Fixture-based** — A provisioning script seeds GitLab with deterministic test data. Tests are order-independent within a file.
4. **Ephemeral GitLab** — Each CI run gets a fresh GitLab CE instance. No state leaks between runs.
5. **Same toolchain** — Vitest + TypeScript, consistent with the unit test setup.
6. **Dockerized runner** — E2E tests are packaged as a Docker image so CI never needs to `npm install` — just pull and run.
7. **Pre-warmed image** — GitLab cold boot is 8-12 min; the warm workflow cuts it to ~2 min. Rebuilt weekly to avoid drift.
8. **Coverage gate** — A bash script in the validate job ensures no tool can be added without a corresponding E2E test. Zero-dependency check (grep + sort).

## Limitations

- **GitLab Premium features** — Group wiki tools (`create_group_wiki_page`, etc.) require Premium. They are skipped in tests and excluded from the coverage gate.
- **Async operations** — Some GitLab operations are async (e.g., group deletion). Tests validate the API accepted the request but do not poll for completion.
- **No runner available** — GitLab CE in CI has no configured runner, so pipeline jobs stay `pending`. Tests that need job output (e.g., `get_job_log`) handle this gracefully.
- **Rate limiting** — Tests run sequentially (`fileParallelism: false` in vitest) to avoid overwhelming the single-container GitLab instance.

## Adding a New Tool Test

1. Identify the test file by domain (e.g., `issues.e2e.ts` for issue tools)
2. Add an `it()` block calling the tool via `globalThis.mcpClient.callTool()`
3. Use `extractText()` or `extractJson()` from `helpers/types.ts` to parse
4. Assert on the response structure (not just "defined")
5. Run `./scripts/check-tool-coverage.sh` locally to verify coverage
6. The coverage gate in CI will also catch missed tools
