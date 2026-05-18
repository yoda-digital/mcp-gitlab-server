# Contributing to GitLab MCP Server

Thank you for your interest in contributing to the GitLab MCP Server! We welcome contributions from the community.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes: `git checkout -b feature/your-feature-name`
4. **Make your changes** following our standards
5. **Test your changes** thoroughly
6. **Commit** with clear, descriptive messages
7. **Push** to your fork
8. **Open a Pull Request** against the `main` branch

---

## 📋 Development Setup

### Prerequisites

- Node.js 18+ and npm
- GitLab account with Personal Access Token
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yoda-digital/mcp-gitlab-server.git
cd mcp-gitlab-server

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Environment Setup

Create a `.env` file (or export environment variables):

```bash
GITLAB_PERSONAL_ACCESS_TOKEN=your-token-here
GITLAB_API_URL=https://gitlab.com/api/v4  # or your GitLab instance API endpoint
```

---

## 🎯 Areas We Welcome Contributions

### High Priority

- **API Documentation** — Document tools with examples, parameters, and response formats
- **Test Coverage** — Unit and integration tests for tools
- **Bug Fixes** — Fix issues reported in GitHub Issues
- **Performance Improvements** — Optimize API calls, caching, pagination

### Medium Priority

- **New Tools** — Add missing GitLab API endpoints as MCP tools
- **Error Handling** — Better error messages and validation
- **Examples** — Real-world use cases and tutorials
- **Type Safety** — Improve TypeScript types and schemas

### Future Features (v0.4.0+)

- Enterprise features (SAML, OAuth3, audit logging)
- Revolutionary features (Jira sync, changelog auto-gen, CI visualization)
- Multi-language SDKs (Python, Go)

---

## 📝 Code Standards

### TypeScript Guidelines

```typescript
// ✅ Good
async function createIssue(
  projectId: string,
  title: string,
  description?: string
): Promise<GitLabIssue> {
  // Implementation
}

// ❌ Bad
async function createIssue(projectId: any, title: any, description: any): Promise<any> {
  // Implementation
}
```

**Rules:**
- Use **strict TypeScript** — no `any` types
- **camelCase** for variables and functions
- **PascalCase** for classes, interfaces, types
- **UPPER_SNAKE_CASE** for constants
- **JSDoc comments** for public APIs with `@param`, `@returns`, `@throws`

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `style` — Code style (formatting, no logic change)
- `refactor` — Code refactoring
- `test` — Adding or updating tests
- `chore` — Build process, dependencies, tooling

**Examples:**
```
feat(pipelines): Add retry_pipeline tool

Implement tool to retry failed GitLab pipelines.
Supports retrying specific jobs or entire pipeline.

Closes #42
```

```
fix(auth): Handle expired tokens gracefully

Previously, expired tokens caused server crash.
Now returns clear error message to user.

Fixes #38
```

### Branch Naming

- `feature/` — New features (`feature/add-pipeline-logs`)
- `fix/` — Bug fixes (`fix/handle-pagination-errors`)
- `docs/` — Documentation (`docs/add-api-examples`)
- `refactor/` — Code refactoring (`refactor/split-gitlab-api-class`)

---

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode (during development)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests

- **Unit tests** for individual functions
- **Integration tests** for tools (with mocked GitLab API)
- **Schema tests** for input/output validation

Example:
```typescript
describe('create_issue tool', () => {
  it('should create issue with valid params', async () => {
    // Test implementation
  });

  it('should reject invalid project_id', async () => {
    // Test implementation
  });
});
```

### Running the E2E suite locally

The repo ships a comprehensive E2E suite under `e2e/` that runs against a real GitLab CE container. CI runs it automatically; the procedure below is for local development.

**Prerequisites:** Docker, Node 22+, ~6 GB free disk, ~8-12 min for a cold GitLab CE boot.

**One-time setup per run:**

```bash
cd e2e

# If host port 8080 is occupied (e.g. by code-server), pick another:
# export GITLAB_HOST_PORT=18080

docker compose up -d gitlab
GITLAB_URL=http://localhost:${GITLAB_HOST_PORT:-8080} \
  GITLAB_READY_TIMEOUT=900 \
  bash src/scripts/wait-for-gitlab.sh

npm ci
export GITLAB_URL=http://localhost:${GITLAB_HOST_PORT:-8080}
export GITLAB_ROOT_PASSWORD='E2eTestPassword1!'
npm run provision
```

**Start the MCP server in another terminal:**

```bash
export GITLAB_PERSONAL_ACCESS_TOKEN=$(jq -r .token e2e/fixtures/fixtures.json)
export GITLAB_API_URL=http://localhost:${GITLAB_HOST_PORT:-8080}/api/v4
export USE_STREAMABLE_HTTP=true
node dist/index.js
```

**Run the tests:**

```bash
cd e2e
export MCP_SERVER_URL=http://127.0.0.1:3000
npm test
```

**Teardown — required between runs:**

```bash
docker compose down -v   # destroys the GitLab volume
```

The suite is **not idempotent today** — re-running `npm test` without resetting the volume causes ~50% failures from `409 Conflict` on duplicated POST entities. Always `docker compose down -v` between runs locally. CI is unaffected because it boots a fresh GitLab per workflow run.

### Adding a new tool

When you add a new MCP tool to `src/index.ts`, you MUST also add an E2E test in the appropriate domain file under `e2e/src/tests/`. The coverage gate (`scripts/check-tool-coverage.sh`) wired into `build.yml` will fail the build if a registered tool has no E2E coverage. Premium-only tools (group wikis) can be whitelisted in the script's `EXCLUDED_TOOLS` array with a comment explaining why.

---

## 📚 Documentation

### Adding Tool Documentation

When adding a new tool:

1. **Update README.md** — Add tool to supported operations list
2. **Create tool doc** — Add `docs/tools/your_tool_name.md`:

```markdown
# tool_name

**Purpose:** Brief description of what the tool does

## Parameters

- `project_id` (string, required) — GitLab project ID or path
- `title` (string, required) — Issue title
- `description` (string, optional) — Issue description

## Response

```json
{
  "id": 123,
  "iid": 45,
  "title": "Bug: Login fails",
  "web_url": "https://gitlab.com/org/project/-/issues/45"
}
```

## Example

```json
{
  "project_id": "my-org/my-project",
  "title": "Feature: Add dark mode",
  "description": "Users requested dark mode support"
}
```

## Related Tools

- `update_issue` — Update existing issue
- `list_issues` — List project issues
```

3. **Add JSDoc** to tool definition in `src/index.ts`

---

## 🔍 Code Review Process

### Pull Request Checklist

Before submitting:

- [ ] Code follows TypeScript standards
- [ ] Tests added and passing (`npm test`)
- [ ] Documentation updated (README, tool docs)
- [ ] Commit messages follow conventional format
- [ ] No linting errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Changes work with both stdio and SSE transports

### Review Timeline

- Initial review within 48 hours
- Feedback addressed within 7 days
- Approved PRs merged within 24 hours

### What We Look For

- **Correctness** — Does it work as intended?
- **Tests** — Are there tests? Do they pass?
- **Documentation** — Is it documented?
- **Code Quality** — Clean, readable, maintainable?
- **Breaking Changes** — Are they necessary? Documented?

---

## 🔄 Maintainer rebase pattern (Path B)

When a contributor's PR sits idle for an extended period and `main` drifts (security batches, releases, dependent fixes), the fair move per project policy is for **the maintainer to absorb the rebase cost rather than push it onto the contributor**. This protects contributor velocity from churn the maintainer caused.

The pattern (verified on PRs #62 → #80 and #63 → #81):

1. **Fetch the contributor's branch locally**:
   ```bash
   git fetch origin pull/<N>/head:pr-<N>-incoming
   ```

2. **Create a fresh branch from current `main`**:
   ```bash
   git checkout -b feat/<topic>-reincarnation main
   ```

3. **Cherry-pick the contributor's commits with `-C` so their authorship is preserved**:
   ```bash
   git cherry-pick -C <sha>
   ```
   Drop commits whose contents are already on `main` via a different path (e.g. an earlier reincarnation). Verify each cherry-pick doesn't restage `src/` files that should stay at main's version.

4. **Apply maintainer corrections as additional commits** in your own name. One commit per finding, conventional-commits style.

5. **Open a new PR** with a title indicating the relationship to the original. PR body MUST include:
   - Explicit credit to the original contributor and the original PR number
   - A line-by-line list of changes vs the original (so the contributor can audit your corrections)
   - A `Co-authored-by: Name <email>` trailer at the bottom (used by the squash merge to preserve credit on the contribution graph)

6. **Merge the new PR**:
   ```bash
   gh pr merge <N> --squash --admin --delete-branch
   ```

7. **Close the original PR** with a credit comment (NOT via the auto-close `Closes #N` keyword — that path silently drops the comment):
   ```bash
   gh pr comment <original-N> --body "<credit + explanation>"
   gh pr close <original-N>
   ```

8. **Verify `Co-authored-by:` landed in main**:
   ```bash
   git show --no-patch --format='%B' <merge-sha> | grep 'Co-authored-by'
   ```
   If missing, the public promise to the contributor has been silently broken — fix immediately (the merge commit can be amended or a follow-up commit can add explicit credit).

The discipline is non-negotiable: a public commit-message promise to a contributor is load-bearing trust. Verify integrity before declaring the reincarnation complete.

---

## 🎯 Release ceremony

This project uses a **release-driven publish model** (since PR #43, released as v0.5.0). Code landing on `main` does **not** publish to npm — releases are deliberate, versioned ceremonies. The `publish.yml` workflow fires on `release.published` or `workflow_dispatch`; pushes to `main` only run `build-and-test` as a safety net.

### When to cut a release

| Trigger | Lead time |
|---|---|
| Any user-visible bug fix or feature | Within ~7 days of merge |
| Security fix (alert closed, CVE patched) | Within 24 hours of merge |
| Internal refactor with no user-visible change | Can wait for the next batched release |
| Dependency-only patch bumps (Dependabot) | Batch into the next release; don't ceremonize each bump |

### Cutting a release — maintainer steps

1. **Confirm `main` is green**:
   ```bash
   gh run list --branch main --limit 3
   ```

2. **Bump the version**:
   ```bash
   npm version <patch|minor|major> --no-git-tag-version
   ```
   This updates `package.json` and `package-lock.json` only — the actual git tag is created via the GitHub Release in step 6.

3. **Date the CHANGELOG**: in `CHANGELOG.md`, move the `## [Unreleased]` entries under a new section `## [X.Y.Z] - YYYY-MM-DD` (use today's UTC date). Leave `[Unreleased]` empty for the next round of entries.

4. **Commit on a release branch**:
   ```bash
   git checkout -b release/X.Y.Z
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "chore(release): X.Y.Z"
   git push -u origin release/X.Y.Z
   ```

5. **Open and merge the release PR**:
   ```bash
   gh pr create --title "chore(release): X.Y.Z" --body "Release prep — version bump + CHANGELOG dating."
   # After CI green:
   gh pr merge <N> --squash --admin --delete-branch
   ```

6. **Create the GitHub Release on the merge commit**:
   ```bash
   gh release create vX.Y.Z \
     --title "vX.Y.Z — <one-line summary>" \
     --notes-file <(awk '/^## \[X\.Y\.Z\]/{flag=1; next} /^## \[/{flag=0} flag' CHANGELOG.md) \
     --target main
   ```
   The `release.published` event fires immediately and starts `publish.yml`.

7. **Verify the release converged**:
   - npm: `npm view @yoda.digital/gitlab-mcp-server@X.Y.Z`
   - ghcr: `docker pull ghcr.io/yoda-digital/mcp-gitlab-server:X.Y.Z`
   - Helm: confirm via `gh run view <build-run-id>` that the chart push step succeeded.

8. **Update the public portal** at `https://opensource.yoda.digital` (mirrors CHANGELOG entries).

### Recovery

If either leg of the release pipeline fails, see `docs/OPERATIONS.md` → "Release atomicity & recovery". Do **not** delete the GitHub Release or tag — they may be cached downstream.

### What NOT to do

- **Don't `npm publish` from your laptop.** Trusted Publishing is the only authorized path; manual publishes break the audit chain.
- **Don't amend a published release.** npm versions are immutable; downstream consumers cache them.
- **Don't skip the version bump** even for tiny fixes. The publish workflow expects monotonic versions and will reject duplicates.
- **Don't rewrite historical CHANGELOG entries.** The public portal at opensource.yoda.digital mirrors them; rewrites break that mirror.

---

## 🚫 What NOT to Do

### ❌ Don't

- Submit PRs without tests
- Use `any` types without justification
- Modify `package.json` version (GitHub Actions handles this)
- Run `npm publish` manually (automated via CI/CD)
- Commit `.env` files or tokens
- Make breaking changes without discussion
- Copy-paste code without attribution

### ✅ Do

- Ask questions in GitHub Discussions before starting large changes
- Reference related issues in PR description
- Keep PRs focused (one feature/fix per PR)
- Update CHANGELOG.md if making user-facing changes
- Test against real GitLab instance
- Follow existing code patterns

---

## 📞 Getting Help

- **Questions?** — [GitHub Discussions](https://github.com/yoda-digital/mcp-gitlab-server/discussions)
- **Bug Report?** — [GitHub Issues](https://github.com/yoda-digital/mcp-gitlab-server/issues)
- **Security Issue?** — Email security@yoda.digital (not public)

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 Recognition

Contributors are recognized in:
- **CHANGELOG.md** — For each release
- **README.md** — Top contributors section
- **GitHub** — Automatic contributor graph

Thank you for helping make this the best GitLab MCP server! 🚀
