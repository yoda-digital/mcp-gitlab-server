# gitlab-mcp

Helm chart for the GitLab MCP Server

**Homepage:** <https://github.com/yoda-digital/mcp-gitlab-server>

## Prerequisites

- Kubernetes 1.26+
- Helm 3.12+

## Installing the chart

```bash
helm install gitlab-mcp oci://ghcr.io/yoda-digital/charts/gitlab-mcp \
  --set secret.GITLAB_PERSONAL_ACCESS_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
```

### Using an existing Secret

```bash
kubectl create secret generic gitlab-mcp-token \
  --from-literal=GITLAB_PERSONAL_ACCESS_TOKEN="glpat-xxxx"

helm install gitlab-mcp oci://ghcr.io/yoda-digital/charts/gitlab-mcp \
  --set existingSecret=gitlab-mcp-token
```

### OAuth mode (per-connection tokens)

```bash
helm install gitlab-mcp oci://ghcr.io/yoda-digital/charts/gitlab-mcp \
  --set config.AUTH_MODE=oauth \
  --set config.CORS_ALLOW_ORIGINS="https://my-app.example.com"
```

## Fail-loud guards

The chart includes render-time validation:

- **Empty PAT token** — fails if `AUTH_MODE=pat` with no token and no `existingSecret`.
- **PDB deadlock** — fails if `minAvailable >= replicaCount` (would block node drains).
- **Mutual exclusion** — fails if both `existingSecret` and inline `secret.GITLAB_PERSONAL_ACCESS_TOKEN` are set.
- **PAT non-loopback** — fails if `AUTH_MODE=pat` with a non-loopback `HOST` (GHSA-8jr5-6gvj-rfpf).

## Image pinning

When `image.digest` is set (e.g. `sha256:abc123...`), the deployment uses
`repository@digest` and the `image.tag` value is ignored. This allows
deterministic rollouts without mutable tags. If both are set, digest wins.

## Multi-replica considerations

SSE and Streamable HTTP transports hold in-memory session state. Running
multiple replicas requires sticky sessions (e.g. session-affinity or an
ingress controller with cookie-based routing). See
[docs/OPERATIONS.md](../docs/OPERATIONS.md) for details.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` |  |
| config | object | `{"AUTH_MODE":"oauth","CORS_ALLOW_ORIGINS":"","GITLAB_API_URL":"https://gitlab.com/api/v4","GITLAB_READ_ONLY_MODE":"false","HEALTHZ_MAX_SESSIONS":"10000","HOST":"0.0.0.0","PORT":"3000","USE_SSE":"true","USE_STREAMABLE_HTTP":"false"}` | GitLab MCP server configuration (non-sensitive) |
| config.AUTH_MODE | string | `"oauth"` | Authentication mode: "oauth" (default) or "pat" "oauth" : per-connection Bearer token forwarded in the Authorization header.           This is the only safe mode for cluster-reachable Service exposure. "pat"   : static token from GITLAB_PERSONAL_ACCESS_TOKEN env var / existingSecret.           UNSUPPORTED in Helm — the chart-level guard refuses install because           pods are reachable via Kubernetes Service, which violates the           loopback-only constraint of PAT mode (GHSA-8jr5-6gvj-rfpf). |
| config.CORS_ALLOW_ORIGINS | string | `""` | Comma-separated list of allowed CORS origins. In PAT-loopback mode: defaults to "*" if empty (local dev only). In OAuth mode: no default (deny browser cross-origin access). |
| config.HEALTHZ_MAX_SESSIONS | string | `"10000"` | Max sessions before /healthz returns 503 (default 10000) |
| config.HOST | string | `"0.0.0.0"` | Bind address. Pods must bind to all interfaces for the Service to reach them, so the chart sets HOST=0.0.0.0. Combined with AUTH_MODE=oauth below, network exposure is auth-gated. The application's own default is HOST=127.0.0.1 (loopback) for non-Helm local-dev safety. |
| existingSecret | string | `""` | Use an existing Secret instead of creating one. The Secret must contain the keys listed in secret{} above. |
| extraEnv | list | `[]` | Extra env vars (list of {name, value} or {name, valueFrom}) |
| extraEnvFrom | list | `[]` | Extra envFrom (list of secretRef/configMapRef) |
| fullnameOverride | string | `""` |  |
| image.digest | string | `""` | Image digest (sha256:...). When set, takes precedence over tag. |
| image.pullPolicy | string | `"IfNotPresent"` |  |
| image.repository | string | `"ghcr.io/yoda-digital/mcp-gitlab-server"` |  |
| image.tag | string | `"latest"` | Image tag. Overridden by CI at package time. Default "latest" is safe for local helm install; tagged releases use semver. |
| nameOverride | string | `""` |  |
| nodeSelector | object | `{}` |  |
| podAnnotations | object | `{}` |  |
| podDisruptionBudget | object | `{"enabled":false,"maxUnavailable":1}` | PodDisruptionBudget (recommended when replicaCount > 1). NOTE: SSE/Streamable HTTP transports hold in-memory session state. Multi-replica requires sticky sessions — see docs/OPERATIONS.md. |
| podLabels | object | `{}` |  |
| probes | object | `{"liveness":{"enabled":true,"initialDelaySeconds":5,"path":"/healthz","periodSeconds":30},"readiness":{"enabled":true,"initialDelaySeconds":3,"path":"/healthz","periodSeconds":10}}` | Liveness / readiness probes |
| replicaCount | int | `1` |  |
| resources.limits.cpu | string | `"500m"` |  |
| resources.limits.memory | string | `"256Mi"` |  |
| resources.requests.cpu | string | `"50m"` |  |
| resources.requests.memory | string | `"128Mi"` |  |
| secret | object | `{"GITLAB_PERSONAL_ACCESS_TOKEN":""}` | Sensitive values injected as env vars from a Secret. Set these or use existingSecret. |
| service.port | int | `3000` |  |
| service.type | string | `"ClusterIP"` |  |
| serviceAccount.create | bool | `true` |  |
| serviceAccount.name | string | `""` |  |
| tolerations | list | `[]` |  |

## Uninstalling

```bash
helm uninstall gitlab-mcp
```

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| Yoda Digital |  | <https://github.com/yoda-digital> |
