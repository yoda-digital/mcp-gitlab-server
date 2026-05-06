# Operations Guide

## Health Checks

Three health endpoints are exposed:

| Endpoint | Purpose | Probe mapping |
| --- | --- | --- |
| `/livez` | Always returns 200 if the HTTP server is responsive. | `livenessProbe` |
| `/readyz` | Returns 503 when session count exceeds `HEALTHZ_MAX_SESSIONS`. | `readinessProbe` |
| `/healthz` | **Deprecated** alias of `/readyz`. Will be removed in a future release. | — |

### `/livez`

- Always `200 OK` with `{"status":"ok"}`.
- Use for liveness: the event loop is alive and the server can serve HTTP.

### `/readyz`

- `200 OK` with `{"status":"ok","sessions":<n>}` when healthy.
- `503 Service Unavailable` with `{"status":"unhealthy","reason":"session_limit_exceeded","sessions":<n>}` when active sessions exceed `HEALTHZ_MAX_SESSIONS` (default: 10000).
- Use for readiness: the pod should be removed from the service rotation (no restart) when overloaded.

### `/healthz` (deprecated)

Alias of `/readyz`. Retained for backward compatibility during the 0.7.x cycle.
Will be removed in 0.8.0.

### Kubernetes Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /livez
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 30
readinessProbe:
  httpGet:
    path: /readyz
    port: 3000
  initialDelaySeconds: 3
  periodSeconds: 10
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listen port |
| `HOST` | `127.0.0.1` | Bind address. Set to `0.0.0.0` to expose to the network — requires `AUTH_MODE=oauth`, otherwise startup refuses (GHSA-8jr5-6gvj-rfpf). |
| `USE_SSE` | `false` | Enable legacy SSE transport |
| `USE_STREAMABLE_HTTP` | `false` | Enable MCP Streamable HTTP transport |
| `AUTH_MODE` | `pat` (app default) / `oauth` (chart default) | `pat` requires loopback bind. `oauth` accepts any bind and validates `Authorization: Bearer` per request, with sessionId bound to the originating Bearer hash. |
| `GITLAB_API_URL` | `https://gitlab.com/api/v4` | GitLab API base URL |
| `GITLAB_PERSONAL_ACCESS_TOKEN` | — | Required in `pat` mode |
| `GITLAB_READ_ONLY_MODE` | `false` | Restrict to read-only tools |
| `CORS_ALLOW_ORIGINS` | — | Comma-separated allowed origins. Empty = `*` only when `AUTH_MODE=pat` AND bind is loopback. Network-exposed binds require an explicit allowlist or get no `Allow-Origin` header. |
| `HEALTHZ_MAX_SESSIONS` | `10000` | Session count threshold for unhealthy status |

## Auth × bind matrix

The HTTP transports carry no authentication of their own in `AUTH_MODE=pat`. The server's safety properties are a function of two axes — see `SECURITY.md` for the full threat model.

| `AUTH_MODE` | `HOST` | Outcome |
|---|---|---|
| `pat` | loopback (127.0.0.0/8, ::1, localhost) | OK for local dev. Wildcard CORS permitted. |
| `pat` | non-loopback | Refused at startup. CWE-306 / CWE-942. |
| `oauth` | any | OK. `Authorization: Bearer` required on every request. SessionId bound to SHA-256 of the originating Bearer; reuse with a different (or missing) Bearer is rejected with 401. |

## Troubleshooting

### Server returns 401 on every request

- **OAuth mode**: Verify the upstream gateway is forwarding the `Authorization: Bearer <token>` header.
- **PAT mode**: Ensure `GITLAB_PERSONAL_ACCESS_TOKEN` is set and the token has not expired.

### High session count / memory growth

Active sessions are stored in-memory. If session count grows unbounded:

1. Check that clients are properly closing SSE connections or sending `DELETE /mcp`.
2. Consider lowering `HEALTHZ_MAX_SESSIONS` and adding a horizontal pod autoscaler based on the `/readyz` response.

### CORS errors in browser console

In OAuth mode, `Access-Control-Allow-Origin: *` is intentionally **not** sent. Set `CORS_ALLOW_ORIGINS` to the exact origin(s) of your frontend application.
