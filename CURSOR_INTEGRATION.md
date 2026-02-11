# Cursor IDE Integration

## Setup

1. Open Cursor Settings → Features → MCP
2. Add GitLab MCP Server to your config:

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["-y", "@yoda.digital/gitlab-mcp-server"],
      "env": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "YOUR_TOKEN_HERE",
        "GITLAB_API_URL": "https://gitlab.com/api/v4"
      }
    }
  }
}
```

## Get GitLab Token

1. Go to GitLab → Settings → Access Tokens
2. Create token with scopes: `api`, `read_repository`, `write_repository`
3. Copy token to config above

## For Self-Hosted GitLab

Replace `GITLAB_API_URL` with your instance:

```json
"GITLAB_API_URL": "https://gitlab.yourcompany.com/api/v4"
```

## Test It

In Cursor chat, try:
- "List my GitLab projects"
- "Show me open issues in project X"
- "Create a branch called feature/new-feature"

## Available Tools

See [README.md](./README.md#-supported-operations) for 50+ available operations.
