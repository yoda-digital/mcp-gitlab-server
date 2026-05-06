/**
 * E2E tests — Users & Groups tools
 *
 * Tools tested:
 * - get_current_user
 * - list_users
 * - get_user
 * - list_groups
 * - get_group
 * - list_group_subgroups
 * - create_group
 * - update_group
 * - delete_group
 * - list_group_projects
 * - get_project
 * - update_project
 */
import { describe, it, expect } from 'vitest';
import { extractJson, extractText } from '../helpers/types.js';

describe('User tools', () => {
  it('get_current_user — returns root user', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_current_user',
      arguments: {},
    });
    const data = extractJson<{ username: string }>(result);
    expect(data.username).toBe('root');
  });

  it('list_users — returns at least one user', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_users',
      arguments: {},
    });
    const data = extractJson<Array<{ id: number }>>(result);
    expect(data.length).toBeGreaterThan(0);
  });

  it('get_user — returns root by ID', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_user',
      arguments: { user_id: 1 },
    });
    const data = extractJson<{ username: string }>(result);
    expect(data.username).toBe('root');
  });
});

describe('Group tools', () => {
  let subgroupId: number;

  it('list_groups — returns the test group', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_groups',
      arguments: {},
    });
    const data = extractJson<Array<{ id: number }>>(result);
    expect(data.some((g) => g.id === globalThis.fixtures.groupId)).toBe(true);
  });

  it('get_group — returns group details', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_group',
      arguments: { group_id: String(globalThis.fixtures.groupId) },
    });
    const data = extractJson<{ id: number; full_path: string }>(result);
    expect(data.id).toBe(globalThis.fixtures.groupId);
  });

  it('create_group — creates a subgroup', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'create_group',
      arguments: {
        name: 'E2E Subgroup',
        path: 'e2e-subgroup',
        parent_id: globalThis.fixtures.groupId,
        visibility: 'private',
      },
    });
    const data = extractJson<{ id: number }>(result);
    expect(data.id).toBeGreaterThan(0);
    subgroupId = data.id;
  });

  it('list_group_subgroups — returns the subgroup', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_group_subgroups',
      arguments: { group_id: String(globalThis.fixtures.groupId) },
    });
    const data = extractJson<Array<{ id: number }>>(result);
    expect(data.some((g) => g.id === subgroupId)).toBe(true);
  });

  it('update_group — updates description', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'update_group',
      arguments: {
        group_id: String(subgroupId),
        description: 'Updated by E2E',
      },
    });
    const data = extractJson<{ description: string }>(result);
    expect(data.description).toBe('Updated by E2E');
  });

  it('delete_group — removes the subgroup', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'delete_group',
      arguments: { group_id: String(subgroupId) },
    });
    // GitLab CE schedules deletion asynchronously (can take 60s+).
    // We only validate the API accepted the request (no error, returns text).
    const text = extractText(result);
    expect(text).toBeDefined();
    expect(text.toLowerCase()).not.toContain('error');
  });

  it('list_group_projects — returns the test project', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_group_projects',
      arguments: { group_id: String(globalThis.fixtures.groupId) },
    });
    const data = extractJson<{ count: number; items: Array<{ id: number }> }>(result);
    expect(data.items.some((p) => p.id === globalThis.fixtures.projectId)).toBe(true);
  });
});

describe('Project tools', () => {
  it('get_project — returns project details', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_project',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<{ id: number; name: string }>(result);
    expect(data.id).toBe(globalThis.fixtures.projectId);
  });

  it('update_project — updates description', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'update_project',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        description: 'Updated by E2E tests',
      },
    });
    const data = extractJson<{ description: string }>(result);
    expect(data.description).toBe('Updated by E2E tests');
  });

  it('get_project_events — returns recent events', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_project_events',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ action_name: string }>>(result);
    expect(data.length).toBeGreaterThan(0);
  });
});
