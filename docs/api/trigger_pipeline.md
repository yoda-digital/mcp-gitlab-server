# trigger_pipeline

Trigger a new CI/CD pipeline for a specific branch or tag.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Project ID or path |
| `ref` | string | Yes | Branch name, tag, or commit SHA |
| `variables` | object | No | Pipeline variables as key-value pairs |

## Response

```json
{
  "id": 47,
  "iid": 12,
  "project_id": 1,
  "status": "pending",
  "ref": "main",
  "sha": "a91957a858320c0e17f3a0eca7cfacbff50ea29a",
  "web_url": "https://gitlab.com/my-org/my-project/-/pipelines/47",
  "created_at": "2024-01-15T10:00:00.000Z",
  "updated_at": "2024-01-15T10:00:00.000Z"
}
```

## Example Usage

### Basic Pipeline Trigger
```json
{
  "project_id": "my-org/my-project",
  "ref": "main"
}
```

### Pipeline with Variables
```json
{
  "project_id": "123",
  "ref": "main",
  "variables": {
    "ENV": "staging",
    "DEPLOY": "true",
    "VERSION": "1.2.3"
  }
}
```

### Trigger on Specific Tag
```json
{
  "project_id": "my-org/my-project",
  "ref": "v1.0.0",
  "variables": {
    "RELEASE": "production"
  }
}
```

## Related Tools

- [`list_pipelines`](./list_pipelines.md) — List project pipelines
- [`get_pipeline`](./get_pipeline.md) — Get pipeline details
- [`retry_pipeline`](./retry_pipeline.md) — Retry failed pipeline
- [`cancel_pipeline`](./cancel_pipeline.md) — Cancel running pipeline

## Notes

- Ref can be branch name, tag, or commit SHA
- Variables override pipeline defaults from `.gitlab-ci.yml`
- Pipeline starts immediately (async operation)
- Check pipeline status with `get_pipeline` tool
- User must have permission to trigger pipelines
