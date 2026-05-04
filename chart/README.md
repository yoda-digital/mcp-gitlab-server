# gitlab-mcp

A Helm chart for the GitLab MCP Server — provides GitLab integration
via the Model Context Protocol (MCP) over SSE or Streamable HTTP.

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

## Values

| Key | Type | Default | Description |
| ----- | ------ | --------- | ------------- |
| `replicaCount` | int | `1` | Number of replicas. Multi-replica requires sticky sessions. |
| `image.repository` | string | `ghcr.io/yoda-digital/mcp-gitlab-server` | Container image repository |
| `image.tag` | string | `"latest"` | Image tag (overridden by CI) |
| `image.pullPolicy` | string | `IfNotPresent` | Image pull policy |
| `config.PORT` | string | `"3000"` | Server listen port |
| `config.USE_SSE` | string | `"true"` | Enable SSE transport |
| `config.USE_STREAMABLE_HTTP` | string | `"false"` | Enable Streamable HTTP transport |
| `config.GITLAB_API_URL` | string | `"https://gitlab.com/api/v4"` | GitLab API base URL |
| `config.GITLAB_READ_ONLY_MODE` | string | `"false"` | Restrict to read-only tools |
| `config.AUTH_MODE` | string | `"pat"` | Authentication mode: `pat` or `oauth` |
| `config.CORS_ALLOW_ORIGINS` | string | `""` | Comma-separated allowed CORS origins |
| `config.HEALTHZ_MAX_SESSIONS` | string | `"10000"` | Max sessions before /healthz returns 503 |
| `secret.GITLAB_PERSONAL_ACCESS_TOKEN` | string | `""` | GitLab PAT (required in `pat` mode) |
| `existingSecret` | string | `""` | Use an existing Secret instead of creating one |
| `service.type` | string | `ClusterIP` | Kubernetes Service type |
| `service.port` | int | `3000` | Service port |
| `resources.requests.cpu` | string | `50m` | CPU request |
| `resources.requests.memory` | string | `128Mi` | Memory request |
| `resources.limits.cpu` | string | `500m` | CPU limit |
| `resources.limits.memory` | string | `256Mi` | Memory limit |
| `extraEnv` | list | `[]` | Additional environment variables |
| `extraEnvFrom` | list | `[]` | Additional envFrom sources |
| `podDisruptionBudget.enabled` | bool | `false` | Enable PDB |
| `podDisruptionBudget.maxUnavailable` | int | `1` | Max unavailable pods during disruption |
| `serviceAccount.create` | bool | `true` | Create a ServiceAccount |
| `serviceAccount.name` | string | `""` | Override ServiceAccount name |
| `probes.liveness.enabled` | bool | `true` | Enable liveness probe |
| `probes.liveness.path` | string | `/healthz` | Liveness probe path |
| `probes.readiness.enabled` | bool | `true` | Enable readiness probe |
| `probes.readiness.path` | string | `/healthz` | Readiness probe path |

## Fail-loud guards

The chart includes render-time validation:

- **Empty PAT token** — fails if `AUTH_MODE=pat` with no token and no `existingSecret`.
- **PDB deadlock** — fails if `minAvailable >= replicaCount` (would block node drains).

## Uninstalling

```bash
helm uninstall gitlab-mcp
```
