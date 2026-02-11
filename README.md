# GitLab MCP Server

<p align="center">
  <img src="./assets/repo-logo.png" alt="GitLab MCP Server Logo" width="200">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@yoda.digital/gitlab-mcp-server">
    <img alt="npm" src="https://img.shields.io/npm/v/@yoda.digital/gitlab-mcp-server?color=blue">
  </a>
  <a href="https://github.com/yoda-digital/mcp-gitlab-server/blob/main/LICENSE">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg">
  </a>
  <a href="https://github.com/yoda-digital/mcp-gitlab-server/issues">
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/yoda-digital/mcp-gitlab-server">
  </a>
  <a href="https://github.com/yoda-digital/mcp-gitlab-server/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/yoda-digital/mcp-gitlab-server">
  </a>
</p>

<p align="center">
  <b>The most comprehensive Model Context Protocol (MCP) server for GitLab — 60+ tools, AI-powered features, enterprise-ready.</b>
</p>

---

## 🏆 Why Choose This GitLab MCP?

### **60+ Tools** vs. Competitors' 10-20
We provide the most comprehensive GitLab API coverage in any MCP implementation:

| Feature Category | Our Implementation | Typical Competitor |
|-----------------|-------------------|-------------------|
| **Total Tools** | **60+** | 10-20 |
| **AI Features** | ✅ Gemini-powered MR descriptions | ❌ None |
| **CI/CD Pipelines** | ✅ Full pipeline management | ⚠️ Basic or missing |
| **Wiki Management** | ✅ With attachments | ⚠️ Limited |
| **Member Management** | ✅ Project + Group | ⚠️ Read-only |
| **Active Development** | ✅ Latest PR Jan 2026 | ❌ Stale repos |
| **Enterprise Features** | ✅ Roadmapped (v0.5.0) | ❌ Missing |

**[See Full Product Vision & Roadmap](./docs/VISION.md)**

---

## ✨ Key Features

### 🤖 AI-Powered Tooling (World's First!)

**Gemini-Powered MR Description Generator** — Save 5-10 minutes per merge request:

```bash
./tools/generate-mr-description.sh feature/my-branch main
```

**What it does:**
- Analyzes commits and changed files
- Generates professional, comprehensive MR descriptions
- Suggests appropriate labels
- Identifies potential breaking changes
- Creates testing checklists

**No other GitLab MCP has this.** [Learn more →](./tools/README.md)

---

### 🔧 Comprehensive GitLab Integration

- **Repository Management** — Search, create, fork, archive repositories
- **File Operations** — Read, create, update, delete files with full branch support
- **Branch Management** — Create, list, delete branches
- **Issue Tracking** — Create, list, filter, close issues with advanced search
- **Merge Requests** — Full MR lifecycle: create, review, approve, merge
- **CI/CD Pipelines** — List, trigger, retry, cancel pipelines + job logs
- **Wiki Management** — Create, update wikis with attachment support (project + group)
- **Member Management** — List and manage project/group members
- **Group Operations** — List projects, members, manage group resources
- **Activity Tracking** — Monitor events, commit history, project activity
- **Labels & Milestones** — Full label and milestone management
- **Protected Branches** — Configure branch protection rules
- **Releases** — Create and manage project releases

**[Full Tool List →](./CLAUDE.md)**

---

### 🚀 Production-Ready Features

- **Both Transports** — stdio + Server-Sent Events (SSE)
- **Consistent API** — Standardized pagination and response formatting
- **Strong Typing** — Built with MCP SDK for type safety
- **Read-Only Mode** — Safe exploration without write access
- **Error Handling** — Comprehensive error messages and validation

---

## 📦 Quick Start

### Installation

#### From npm (Recommended)

```bash
npm install @yoda.digital/gitlab-mcp-server
```

#### From Source

```bash
git clone https://github.com/yoda-digital/mcp-gitlab-server.git
cd mcp-gitlab-server
npm install
npm run build
```

### Configuration

#### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "node",
      "args": ["/path/to/mcp-gitlab-server/build/index.js"],
      "env": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "your-token-here",
        "GITLAB_URL": "https://gitlab.com"
      }
    }
  }
}
```

#### For Cursor IDE

See our [Cursor Integration Guide](./docs/CURSOR_INTEGRATION.md) for step-by-step setup.

### Environment Variables

- `GITLAB_PERSONAL_ACCESS_TOKEN` — Your GitLab PAT (required)
- `GITLAB_URL` — GitLab instance URL (default: `https://gitlab.com`)
- `GITLAB_READ_ONLY` — Set to `true` for read-only mode (optional)

---

## 🎯 Use Cases

- **AI-Assisted Development** — Let AI create MRs, manage issues, trigger CI/CD
- **Automated Workflows** — Build GitLab automation with natural language
- **Code Review** — AI-powered MR descriptions and review assistance
- **Project Management** — Manage issues, milestones, and team members via AI
- **CI/CD Orchestration** — Monitor and control pipelines through conversational interface
- **Documentation** — Auto-generate changelogs, update wikis, manage releases

---

## 📚 Documentation

- **[Product Vision & Roadmap](./docs/VISION.md)** — Strategic direction and milestones
- **[Full Tool Reference](./CLAUDE.md)** — All 60+ tools with examples
- **[Cursor Integration](./docs/CURSOR_INTEGRATION.md)** — IDE setup guide
- **[AI Tools Guide](./tools/README.md)** — MR description generator & more
- **[Contributing](./CONTRIBUTING.md)** — How to contribute
- **[Changelog](./CHANGELOG.md)** — Release history

---

## 🗺️ Roadmap

### v0.3.1 (Feb 15, 2026) — Documentation & Stability
- [ ] Expanded API documentation
- [ ] README competitive positioning ✅
- [ ] Bug fixes and stability improvements

### v0.4.0 (Mar 1, 2026) — Revolutionary Feature
- [ ] Jira Sync or Changelog Auto-Gen or CI Visualization
- [ ] Feature no other GitLab MCP has

### v0.5.0 (Mar 31, 2026) — Enterprise Ready
- [ ] SAML/OAuth3 authentication
- [ ] Audit logging & compliance
- [ ] High-availability deployment guide

**[Full roadmap & strategic vision →](./docs/VISION.md)**

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Areas we'd love help with:**
- Additional tool implementations
- Documentation improvements
- Test coverage expansion
- Enterprise feature development

---

## 📄 License

MIT — see [LICENSE](./LICENSE) file.

---

## 🌟 Why We're Building This

GitLab is powerful, but most AI assistants can't leverage it effectively. Existing MCP implementations are limited (10-20 tools) and lack AI features.

**Our mission:** Make GitLab fully accessible to AI — from basic repo operations to advanced CI/CD orchestration and enterprise workflows.

**[Read our full product vision →](./docs/VISION.md)**

---

## 🔗 Links

- [npm Package](https://www.npmjs.com/package/@yoda.digital/gitlab-mcp-server)
- [GitHub Repository](https://github.com/yoda-digital/mcp-gitlab-server)
- [Report Issues](https://github.com/yoda-digital/mcp-gitlab-server/issues)
- [MCP Documentation](https://modelcontextprotocol.io)

---

**Built with ❤️ by [Yoda.Digital](https://yoda.digital)**
