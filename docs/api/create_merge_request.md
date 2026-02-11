# create_merge_request

Create a new merge request in a GitLab project.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Project ID or path |
| `source_branch` | string | Yes | Source branch name |
| `target_branch` | string | Yes | Target branch name (usually `main` or `master`) |
| `title` | string | Yes | MR title |
| `description` | string | No | MR description (supports Markdown) |
| `assignee_id` | number | No | User ID to assign as reviewer |
| `assignee_ids` | number[] | No | Array of user IDs to assign |
| `milestone_id` | number | No | Milestone ID |
| `labels` | string | No | Comma-separated label names |
| `remove_source_branch` | boolean | No | Delete source branch after merge (default: false) |
| `squash` | boolean | No | Squash commits on merge (default: false) |

## Response

```json
{
  "id": 1,
  "iid": 1,
  "project_id": 3,
  "title": "Add new dashboard UI",
  "description": "Implements redesigned dashboard with dark mode support",
  "state": "opened",
  "created_at": "2024-01-15T09:00:00.000Z",
  "updated_at": "2024-01-15T09:00:00.000Z",
  "merged_at": null,
  "closed_at": null,
  "target_branch": "main",
  "source_branch": "feature/new-ui",
  "author": {
    "id": 25,
    "username": "john_smith",
    "name": "John Smith"
  },
  "assignee": null,
  "assignees": [],
  "labels": [],
  "work_in_progress": false,
  "merge_when_pipeline_succeeds": false,
  "merge_status": "can_be_merged",
  "has_conflicts": false,
  "web_url": "https://gitlab.com/my-org/my-project/-/merge_requests/1"
}
```

## Example Usage

### Basic Merge Request
```json
{
  "project_id": "my-org/my-project",
  "source_branch": "feature/new-ui",
  "target_branch": "main",
  "title": "Add new dashboard UI",
  "description": "Implements redesigned dashboard with dark mode support"
}
```

### MR with Assignee and Labels
```json
{
  "project_id": "123",
  "source_branch": "fix/memory-leak",
  "target_branch": "main",
  "title": "Fix: Memory leak in pipeline operations",
  "description": "## Changes\n- Fixed memory leak\n- Added tests\n\n## Testing\n- All tests pass",
  "assignee_id": 42,
  "labels": "bug,performance"
}
```

### Auto-cleanup MR with Squash
```json
{
  "project_id": "my-org/my-project",
  "source_branch": "feature/quick-fix",
  "target_branch": "main",
  "title": "Quick fix for login issue",
  "description": "Single-commit fix",
  "remove_source_branch": true,
  "squash": true
}
```

## Related Tools

- [`update_merge_request`](./update_merge_request.md) — Update MR details
- [`merge_merge_request`](./merge_merge_request.md) — Merge an MR
- [`approve_merge_request`](./approve_merge_request.md) — Approve an MR
- [`list_merge_requests`](./list_merge_requests.md) — List project MRs

## Notes

- Both branches must exist before creating MR
- Source and target branch cannot be the same
- Description supports full Markdown formatting
- Squash combines all commits into one on merge
- `remove_source_branch` auto-deletes branch after successful merge
