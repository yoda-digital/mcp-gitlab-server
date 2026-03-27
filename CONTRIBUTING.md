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
