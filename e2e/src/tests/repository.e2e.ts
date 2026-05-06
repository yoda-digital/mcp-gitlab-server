/**
 * E2E tests — Repository tools
 *
 * Tools tested:
 * - search_repositories
 * - create_repository
 * - get_file_contents
 * - create_or_update_file
 * - push_files
 * - get_repository_tree
 * - list_commits
 * - list_branches
 * - create_branch
 * - delete_branch
 * - compare_branches
 * - list_tags
 * - create_tag
 * - fork_repository
 */
import { describe, it, expect } from 'vitest';
import { extractJson, extractText } from '../helpers/types.js';

describe('Repository tools', () => {
  it('search_repositories — finds the test project', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'search_repositories',
      arguments: { search: 'e2e-test-project' },
    });
    const data = extractJson<{ count: number; items: Array<{ path_with_namespace: string }> }>(result);
    expect(data.items.some((r) => r.path_with_namespace.includes('e2e-test-project'))).toBe(true);
  });

  it('get_repository_tree — lists files in root', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_repository_tree',
      arguments: { project_id: String(globalThis.fixtures.projectId), path: '', ref: 'main' },
    });
    const data = extractJson<Array<{ name: string }>>(result);
    expect(data.some((f) => f.name === 'README.md')).toBe(true);
  });

  it('get_file_contents — reads README.md with content', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_file_contents',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        file_path: 'README.md',
        ref: 'main',
      },
    });
    const text = extractText(result);
    expect(text.length).toBeGreaterThan(0);
    // README should contain project name or markdown content
    expect(text).toContain('e2e-test-project');
  });

  it('create_or_update_file — creates a new file', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'create_or_update_file',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        file_path: 'e2e-created-file.txt',
        content: 'Hello from E2E tests',
        commit_message: 'test: create file via E2E',
        branch: 'main',
      },
    });
    const data = extractJson<{ file_path: string }>(result);
    expect(data.file_path).toBe('e2e-created-file.txt');
  });

  it('push_files — pushes multiple files in one commit', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'push_files',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        branch: 'main',
        commit_message: 'test: push multiple files via E2E',
        files: [
          { path: 'multi-a.txt', content: 'File A' },
          { path: 'multi-b.txt', content: 'File B' },
        ],
      },
    });
    const text = extractText(result);
    expect(text).toBeDefined();

    // Verify both files exist in the repo tree
    const treeResult = await globalThis.mcpClient.callTool({
      name: 'get_repository_tree',
      arguments: { project_id: String(globalThis.fixtures.projectId), path: '', ref: 'main' },
    });
    const tree = extractJson<Array<{ name: string }>>(treeResult);
    expect(tree.some((f) => f.name === 'multi-a.txt')).toBe(true);
    expect(tree.some((f) => f.name === 'multi-b.txt')).toBe(true);
  });

  it('list_commits — returns commits with expected structure', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_commits',
      arguments: { project_id: String(globalThis.fixtures.projectId), ref_name: 'main' },
    });
    const data = extractJson<Array<{ id: string; title: string; author_name: string }>>(result);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].id).toMatch(/^[0-9a-f]{40}$/);
    expect(data[0].title).toBeDefined();
    expect(data[0].author_name).toBeDefined();
  });

  it('list_branches — includes main', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_branches',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ name: string }>>(result);
    expect(data.some((b) => b.name === 'main')).toBe(true);
  });

  it('create_branch + delete_branch — roundtrip', async () => {
    const branchName = `e2e-temp-${Date.now()}`;

    const createResult = await globalThis.mcpClient.callTool({
      name: 'create_branch',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        branch: branchName,
        ref: 'main',
      },
    });
    const createData = extractJson<{ name: string }>(createResult);
    expect(createData.name).toBe(branchName);

    const deleteResult = await globalThis.mcpClient.callTool({
      name: 'delete_branch',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        branch: branchName,
      },
    });
    expect(extractText(deleteResult)).toBeDefined();

    // Verify branch no longer exists
    const listResult = await globalThis.mcpClient.callTool({
      name: 'list_branches',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const branches = extractJson<Array<{ name: string }>>(listResult);
    expect(branches.some((b) => b.name === branchName)).toBe(false);
  });

  it('compare_branches — shows diff between branches', async () => {
    // Create a branch with a unique file so we have a guaranteed diff
    const compareBranch = `e2e-compare-${Date.now()}`;
    await globalThis.mcpClient.callTool({
      name: 'create_branch',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        branch: compareBranch,
        ref: 'main',
      },
    });
    await globalThis.mcpClient.callTool({
      name: 'create_or_update_file',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        file_path: 'compare-test.txt',
        content: 'diff content',
        commit_message: 'test: add file for compare test',
        branch: compareBranch,
      },
    });

    const result = await globalThis.mcpClient.callTool({
      name: 'compare_branches',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        from: 'main',
        to: compareBranch,
      },
    });
    const data = extractJson<{ diffs: unknown[] }>(result);
    expect(data.diffs.length).toBeGreaterThan(0);
  });

  it('create_tag + list_tags — roundtrip', async () => {
    const tagName = `e2e-v${Date.now()}`;
    await globalThis.mcpClient.callTool({
      name: 'create_tag',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        tag_name: tagName,
        ref: 'main',
        message: 'E2E test tag',
      },
    });

    const result = await globalThis.mcpClient.callTool({
      name: 'list_tags',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ name: string }>>(result);
    expect(data.some((t) => t.name === tagName)).toBe(true);
  });

  it('create_repository — creates a new project', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'create_repository',
      arguments: {
        name: 'e2e-created-repo',
        visibility: 'private',
        initialize_with_readme: true,
      },
    });
    const data = extractJson<{ id: number }>(result);
    expect(data.id).toBeGreaterThan(0);
  });

  it('fork_repository — forks the test project', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'fork_repository',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
      },
    });
    const data = extractJson<{ id: number }>(result);
    expect(data.id).toBeGreaterThan(0);
  });
});
