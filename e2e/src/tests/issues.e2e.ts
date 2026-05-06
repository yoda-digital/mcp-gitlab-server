/**
 * E2E tests — Issue tools
 *
 * Tools tested:
 * - list_issues
 * - create_issue
 * - update_issue
 * - create_issue_note
 * - list_issue_notes
 * - list_issue_discussions
 */
import { describe, it, expect } from 'vitest';
import { extractJson } from '../helpers/types.js';

describe('Issue tools', () => {
  it('list_issues — returns the provisioned issue', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_issues',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ iid: number }>>(result);
    expect(data.some((i) => i.iid === globalThis.fixtures.issueIid)).toBe(true);
  });

  it('create_issue — creates a new issue', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'create_issue',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        title: 'E2E created issue',
        description: 'Created during E2E test run',
      },
    });
    const data = extractJson<{ iid: number; title: string }>(result);
    expect(data.iid).toBeGreaterThan(0);
    expect(data.title).toBe('E2E created issue');
  });

  it('update_issue — updates title and labels', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'update_issue',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        issue_iid: globalThis.fixtures.issueIid,
        title: 'E2E test issue — updated',
        labels: [globalThis.fixtures.labelName],
      },
    });
    const data = extractJson<{ title: string }>(result);
    expect(data.title).toBe('E2E test issue — updated');
  });

  it('create_issue_note — adds a comment', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'create_issue_note',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        issue_iid: globalThis.fixtures.issueIid,
        body: 'This is an E2E test comment',
      },
    });
    const data = extractJson<{ id: number; body: string }>(result);
    expect(data.body).toContain('E2E test comment');
  });

  it('list_issue_notes — returns the comment we just created', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_issue_notes',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        issue_iid: globalThis.fixtures.issueIid,
      },
    });
    const data = extractJson<Array<{ body: string }>>(result);
    expect(data.some((n) => n.body.includes('E2E test comment'))).toBe(true);
  });

  it('list_issue_discussions — returns at least one discussion', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_issue_discussions',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        issue_iid: globalThis.fixtures.issueIid,
      },
    });
    const data = extractJson<Array<{ id: string }>>(result);
    expect(data.length).toBeGreaterThan(0);
  });
});
