# GitLab MCP Server Configuration Guide

This guide covers how to configure the GitLab MCP Server for optimal performance and security.

## Quick Start

1. **Copy the example configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Edit your `.env` file:**
   ```bash
   # Required: Your GitLab Personal Access Token
   GITLAB_PERSONAL_ACCESS_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
   
   # Optional: GitLab API URL (defaults to GitLab.com)
   GITLAB_API_URL=https://gitlab.com/api/v4
   ```

3. **Validate your configuration:**
   ```bash
   npm run validate
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

## Environment Variables

### Required Variables

#### `GITLAB_PERSONAL_ACCESS_TOKEN`
Your GitLab Personal Access Token for API authentication.

- **Required**: Yes
- **Format**: `glpat-` followed by 20+ characters
- **Example**: `glpat-xxxxxxxxxxxxxxxxxxxx`

**How to create:**
1. Go to [GitLab Personal Access Tokens](https://gitlab.com/-/profile/personal_access_tokens)
2. Click "Add new token"
3. Choose scopes (see [Token Permissions](#token-permissions) below)
4. Set expiration date
5. Click "Create personal access token"

### Optional Variables

#### `GITLAB_API_URL`
The base URL for your GitLab instance API.

- **Default**: `https://gitlab.com/api/v4`
- **Format**: Must end with `/api/v4`
- **Examples**:
  - GitLab.com: `https://gitlab.com/api/v4`
  - Self-hosted: `https://your-gitlab.example.com/api/v4`

#### `PORT`
Server port for SSE (Server-Sent Events) transport mode.

- **Default**: `3000`
- **Range**: 1-65535
- **Example**: `3001`

#### `USE_SSE`
Enable Server-Sent Events transport instead of stdio.

- **Default**: `false`
- **Values**: `true` or `false`
- **Use case**: Set to `true` for HTTP-based communication

#### `GITLAB_READ_ONLY_MODE`
Restrict server to read-only operations.

- **Default**: `false`
- **Values**: `true` or `false`
- **Use case**: Security hardening, monitoring-only setups

## Token Permissions

### Required Scopes
Your GitLab token must have these scopes for basic functionality:

- **`read_api`**: Read access to the API
- **`read_repository`**: Read repository content
- **`read_user`**: Read user information

### Optional Scopes (for full functionality)
- **`write_repository`**: Create/edit files, branches, etc.
- **`api`**: Full API access for advanced operations

### Scope Testing
The server automatically tests token permissions on startup:

```bash
npm run validate
```

Example output:
```
✅ Configuration is valid!

Configuration Summary:
  GitLab API URL: https://gitlab.com/api/v4
  Port: 3000
  Transport: stdio
  Read-only mode: disabled

⚠️  Warnings:
  • Token missing recommended permission: write_repository (read-only operations will be available)
```

## Configuration Files

### `.env` File
Primary configuration file (not committed to version control):

```bash
# Copy from .env.example
cp .env.example .env

# Edit with your settings
nano .env
```

### `.env.example`
Template file with all configuration options and documentation.

### `.env.development`
Example development configuration with SSE transport enabled.

## Validation Commands

### Basic Validation
```bash
npm run validate
```

Checks:
- Environment variable presence and format
- GitLab API connectivity
- Token permissions
- Configuration consistency

### List Available Tools
```bash
npm run list-tools
```

Shows all MCP tools available with current configuration.

### Help Information
```bash
npm run help
```

Displays usage information and configuration guide.

## Transport Modes

### Stdio Transport (Default)
- **Best for**: MCP integrations, CLI usage
- **Configuration**: `USE_SSE=false`
- **Communication**: Standard input/output streams

### SSE Transport
- **Best for**: Web applications, HTTP clients
- **Configuration**: `USE_SSE=true`
- **Port**: Configurable via `PORT` environment variable
- **Endpoints**:
  - `GET /sse` - Establish SSE connection
  - `POST /messages` - Send messages

## Security Considerations

### Token Security
- **Never commit tokens** to version control
- **Use environment variables** or secure secret management
- **Set appropriate expiration dates**
- **Use minimal required scopes**

### Read-Only Mode
Enable for security-sensitive environments:

```bash
GITLAB_READ_ONLY_MODE=true
```

This disables all write operations including:
- File creation/modification
- Issue creation
- Merge request creation
- Branch creation
- Repository creation

### Network Security
- **Use HTTPS** for GitLab API URLs
- **Firewall configuration** for SSE mode
- **Token rotation** on a regular schedule

## Troubleshooting

### Common Issues

#### "GitLab token is invalid or expired"
- Check token is correctly copied
- Verify token hasn't expired
- Ensure token has required scopes

#### "GitLab API URL not found"
- Verify URL format includes `/api/v4`
- Check self-hosted GitLab instance accessibility
- Confirm network connectivity

#### "Token missing required permission"
- Recreate token with proper scopes
- Check GitLab instance admin restrictions
- Verify user account permissions

### Validation Errors
Run detailed validation for diagnostic information:

```bash
npm run validate
```

### Debug Mode
Enable verbose logging for troubleshooting:

```bash
DEBUG=* npm start
```

## Configuration Examples

### Development Setup
```bash
# .env.development
GITLAB_PERSONAL_ACCESS_TOKEN=glpat-development-token
GITLAB_API_URL=https://gitlab.com/api/v4
PORT=3001
USE_SSE=true
GITLAB_READ_ONLY_MODE=false
```

### Production Setup
```bash
# .env.production
GITLAB_PERSONAL_ACCESS_TOKEN=glpat-production-token
GITLAB_API_URL=https://gitlab.company.com/api/v4
PORT=3000
USE_SSE=false
GITLAB_READ_ONLY_MODE=false
```

### Read-Only Monitoring
```bash
# .env.monitoring
GITLAB_PERSONAL_ACCESS_TOKEN=glpat-readonly-token
GITLAB_API_URL=https://gitlab.com/api/v4
PORT=3000
USE_SSE=true
GITLAB_READ_ONLY_MODE=true
```

### Self-Hosted GitLab
```bash
# .env.selfhosted
GITLAB_PERSONAL_ACCESS_TOKEN=glpat-selfhosted-token
GITLAB_API_URL=https://git.company.internal/api/v4
PORT=3000
USE_SSE=false
GITLAB_READ_ONLY_MODE=false
```

## Advanced Configuration

### Multiple Environments
Use different configuration files for different environments:

```bash
# Development
cp .env.development .env

# Production
cp .env.production .env

# Monitoring
cp .env.monitoring .env
```

### CI/CD Integration
For automated deployments:

```yaml
# Example GitHub Actions
env:
  GITLAB_PERSONAL_ACCESS_TOKEN: ${{ secrets.GITLAB_TOKEN }}
  GITLAB_API_URL: https://gitlab.com/api/v4
  GITLAB_READ_ONLY_MODE: true
```

### Container Deployment
Docker environment configuration:

```dockerfile
ENV GITLAB_PERSONAL_ACCESS_TOKEN=""
ENV GITLAB_API_URL="https://gitlab.com/api/v4"
ENV PORT="3000"
ENV USE_SSE="false"
ENV GITLAB_READ_ONLY_MODE="false"
```

## Support

For additional help:
- **Documentation**: [README.md](./README.md)
- **Issues**: [GitHub Issues](https://github.com/dangerusslee/mcp-gitlab-server/issues)
- **Validation**: Run `npm run validate` for diagnostic information