# Operations Guide

## Health Checks

The `/healthz` endpoint returns:

- `200 OK` with `{"status":"ok","sessions":<n>}` when healthy.
- `503 Service Unavailable` with `{"status":"unhealthy","reason":"session_limit_exceeded","sessions":<n>}` when active sessions exceed `HEALTHZ_MAX_SESSIONS` (default: 10000).

### Kubernetes Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 30
readinessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 3
  periodSeconds: 10
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listen port |
| `USE_SSE` | `false` | Enable legacy SSE transport |
| `USE_STREAMABLE_HTTP` | `false` | Enable MCP Streamable HTTP transport |
| `AUTH_MODE` | `pat` | `pat` or `oauth` |
| `GITLAB_API_URL` | `https://gitlab.com/api/v4` | GitLab API base URL |
| `GITLAB_PERSONAL_ACCESS_TOKEN` | — | Required in `pat` mode |
| `GITLAB_READ_ONLY_MODE` | `false` | Restrict to read-only tools |
| `CORS_ALLOW_ORIGINS` | — | Comma-separated allowed origins (empty = `*` in PAT mode, deny in OAuth mode) |
| `HEALTHZ_MAX_SESSIONS` | `10000` | Session count threshold for unhealthy status |

## Troubleshooting

### Server returns 401 on every request

- **OAuth mode**: Verify the upstream gateway is forwarding the `Authorization: Bearer <token>` header.
- **PAT mode**: Ensure `GITLAB_PERSONAL_ACCESS_TOKEN` is set and the token has not expired.

### High session count / memory growth

Active sessions are stored in-memory. If session count grows unbounded:

1. Check that clients are properly closing SSE connections or sending `DELETE /mcp`.
2. Consider lowering `HEALTHZ_MAX_SESSIONS` and adding a horizontal pod autoscaler based on the `/healthz` response.

### CORS errors in browser console

In OAuth mode, `Access-Control-Allow-Origin: *` is intentionally **not** sent. Set `CORS_ALLOW_ORIGINS` to the exact origin(s) of your frontend application.
