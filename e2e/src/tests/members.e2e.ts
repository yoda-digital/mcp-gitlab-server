/**
 * E2E tests — Members tools
 *
 * Tools tested:
 * - list_project_members
 * - list_group_members
 */
import { describe, it, expect } from 'vitest';
import { extractJson } from '../helpers/types.js';

describe('Members tools', () => {
  it('list_project_members — returns at least the owner', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_project_members',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ username: string }>>(result);
    expect(data.length).toBeGreaterThan(0);
    expect(data.some((m) => m.username === 'root')).toBe(true);
  });

  it('list_group_members — returns at least the owner', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_group_members',
      arguments: { group_id: String(globalThis.fixtures.groupId) },
    });
    const data = extractJson<Array<{ username: string }>>(result);
    expect(data.length).toBeGreaterThan(0);
  });
});
