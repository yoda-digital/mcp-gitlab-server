/**
 * E2E tests — Environment & Release tools
 *
 * Tools tested:
 * - list_environments
 * - get_environment
 * - list_releases
 * - create_release
 */
import { describe, it, expect } from 'vitest';
import { extractJson } from '../helpers/types.js';

describe('Environment tools', () => {
  let environmentId: number | undefined;

  it('list_environments — returns environments array', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_environments',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ id: number; name: string }>>(result);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      // If environments exist, validate structure
      expect(data[0].id).toBeGreaterThan(0);
      expect(data[0].name).toBeDefined();
      environmentId = data[0].id;
    }
  });

  it('get_environment — returns environment details', async () => {
    if (!environmentId) {
      // No environment available — skip gracefully
      return;
    }
    const result = await globalThis.mcpClient.callTool({
      name: 'get_environment',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        environment_id: environmentId,
      },
    });
    const data = extractJson<{ id: number; name: string }>(result);
    expect(data.id).toBe(environmentId);
    expect(data.name).toBeDefined();
  });
});

describe('Release tools', () => {
  it('create_release — creates a release', async () => {
    // Ensure a tag exists
    const tagName = 'e2e-release-v1.0.0';
    await globalThis.mcpClient.callTool({
      name: 'create_tag',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        tag_name: tagName,
        ref: 'main',
        message: 'E2E release tag',
      },
    });

    const result = await globalThis.mcpClient.callTool({
      name: 'create_release',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        tag_name: tagName,
        name: 'E2E Release v1.0.0',
        description: 'Release created by E2E tests',
      },
    });
    const data = extractJson<{ tag_name: string; name: string }>(result);
    expect(data.tag_name).toBe(tagName);
    expect(data.name).toBe('E2E Release v1.0.0');
  });

  it('list_releases — returns the release we just created', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_releases',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ tag_name: string }>>(result);
    expect(data.some((r) => r.tag_name === 'e2e-release-v1.0.0')).toBe(true);
  });
});
