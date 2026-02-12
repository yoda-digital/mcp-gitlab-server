# create_issue

Create a new issue in a GitLab project.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Project ID or path (e.g., `"my-org/my-project"` or `"123"`) |
| `title` | string | Yes | Issue title |
| `description` | string | No | Issue description (supports Markdown) |
| `assignee_ids` | number[] | No | Array of user IDs to assign |
| `milestone_id` | number | No | Milestone ID |
| `labels` | string | No | Comma-separated label names |
| `due_date` | string | No | Due date in ISO 8601 format (YYYY-MM-DD) |
| `confidential` | boolean | No | Whether the issue is confidential |

## Response

```json
{
  "id": 84,
  "iid": 14,
  "project_id": 3,
  "title": "Bug: Login fails on mobile",
  "description": "Users cannot log in on mobile devices...",
  "state": "opened",
  "created_at": "2024-01-15T08:30:00.000Z",
  "updated_at": "2024-01-15T08:30:00.000Z",
  "labels": ["bug", "mobile"],
  "milestone": null,
  "assignees": [],
  "author": {
    "id": 25,
    "username": "john_smith",
    "name": "John Smith"
  },
  "assignee": null,
  "web_url": "https://gitlab.com/my-org/my-project/-/issues/14"
}
```

## Example Usage

### Basic Issue
```json
{
  "project_id": "my-org/my-project",
  "title": "Bug: Login fails on mobile",
  "description": "## Steps to Reproduce\n1. Open app\n2. Tap login\n3. Error appears"
}
```

### Issue with Labels and Milestone
```json
{
  "project_id": "123",
  "title": "Feature: Add dark mode",
  "description": "Users have requested dark mode support",
  "labels": "enhancement,ui",
  "milestone_id": 5
}
```

### Assigned Issue with Due Date
```json
{
  "project_id": "my-org/my-project",
  "title": "Security: Update dependencies",
  "description": "Critical security patches needed",
  "assignee_ids": [42],
  "labels": "security,urgent",
  "due_date": "2024-01-20"
}
```

## Related Tools

- [`update_issue`](./update_issue.md) — Update existing issue
- [`list_issues`](./list_issues.md) — List project issues
- [`create_issue_note`](./create_issue_note.md) — Add comment to issue
- [`list_issue_notes`](./list_issue_notes.md) — List issue comments

## Notes

- Project ID can be either numeric ID or path format (`org/project`)
- Labels should be comma-separated without spaces: `"bug,urgent"` not `"bug, urgent"`
- Description supports full Markdown including code blocks, lists, tables
- For confidential issues, user must have appropriate permissions
