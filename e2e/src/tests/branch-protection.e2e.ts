/**
 * E2E tests — Branch protection tools
 *
 * Tools tested:
 * - list_protected_branches
 * - protect_branch
 * - unprotect_branch
 */
import { describe, it, expect } from 'vitest';
import { extractJson, extractText } from '../helpers/types.js';

describe('Branch protection tools', () => {
  const branchToProtect = 'main';

  it('protect_branch — protects a branch', async () => {
    // First unprotect in case it was already protected by default
    try {
      await globalThis.mcpClient.callTool({
        name: 'unprotect_branch',
        arguments: {
          project_id: String(globalThis.fixtures.projectId),
          name: branchToProtect,
        },
      });
    } catch {
      // Ignore if not protected
    }

    const result = await globalThis.mcpClient.callTool({
      name: 'protect_branch',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        name: branchToProtect,
        push_access_level: 40,
        merge_access_level: 40,
      },
    });
    const data = extractJson<{ name: string }>(result);
    expect(data.name).toBe(branchToProtect);
  });

  it('list_protected_branches — returns the protected branch', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_protected_branches',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ name: string }>>(result);
    expect(data.some((b) => b.name === branchToProtect)).toBe(true);
  });

  it('unprotect_branch — removes protection', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'unprotect_branch',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        name: branchToProtect,
      },
    });
    expect(extractText(result)).toBeDefined();

    // Verify branch is no longer in protected list
    const listResult = await globalThis.mcpClient.callTool({
      name: 'list_protected_branches',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ name: string }>>(listResult);
    expect(data.some((b) => b.name === branchToProtect)).toBe(false);
  });
});
