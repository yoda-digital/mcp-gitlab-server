/**
 * E2E tests — Wiki tools
 *
 * Tools tested:
 * - list_project_wiki_pages
 * - get_project_wiki_page
 * - create_project_wiki_page
 * - edit_project_wiki_page
 * - delete_project_wiki_page
 * - upload_project_wiki_attachment
 * - list_group_wiki_pages
 * - get_group_wiki_page
 * - create_group_wiki_page
 * - edit_group_wiki_page
 * - delete_group_wiki_page
 * - upload_group_wiki_attachment
 */
import { describe, it, expect } from 'vitest';
import { extractJson, extractText } from '../helpers/types.js';

describe('Project Wiki tools', () => {
  it('list_project_wiki_pages — returns the provisioned page', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_project_wiki_pages',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ slug: string }>>(result);
    expect(data.some((p) => p.slug === globalThis.fixtures.wikiPageSlug)).toBe(true);
  });

  it('get_project_wiki_page — returns content', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_project_wiki_page',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        slug: globalThis.fixtures.wikiPageSlug,
      },
    });
    const data = extractJson<{ content: string }>(result);
    expect(data.content).toContain('E2E Wiki');
  });

  it('create_project_wiki_page — creates a new page', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'create_project_wiki_page',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        title: 'E2E Created Wiki Page',
        content: '# Created by E2E\n\nTest content.',
      },
    });
    const data = extractJson<{ slug: string }>(result);
    expect(data.slug).toBeDefined();
  });

  it('edit_project_wiki_page — updates content', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'edit_project_wiki_page',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        slug: globalThis.fixtures.wikiPageSlug,
        content: '# E2E Wiki — Updated\n\nEdited by E2E tests.',
      },
    });
    const data = extractJson<{ content: string }>(result);
    expect(data.content).toContain('Updated');
  });

  it('delete_project_wiki_page — removes a page', async () => {
    // Create a page to delete
    const createResult = await globalThis.mcpClient.callTool({
      name: 'create_project_wiki_page',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        title: 'Page To Delete',
        content: 'This will be deleted',
      },
    });
    const { slug } = extractJson<{ slug: string }>(createResult);

    const result = await globalThis.mcpClient.callTool({
      name: 'delete_project_wiki_page',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        slug,
      },
    });
    expect(extractText(result)).toBeDefined();

    // Verify page no longer exists in list
    const listResult = await globalThis.mcpClient.callTool({
      name: 'list_project_wiki_pages',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const pages = extractJson<Array<{ slug: string }>>(listResult);
    expect(pages.some((p) => p.slug === slug)).toBe(false);
  });

  it('upload_project_wiki_attachment — uploads a file', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'upload_project_wiki_attachment',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        file_path: 'uploads/e2e-test.txt',
        content: 'E2E attachment content',
      },
    });
    const data = extractJson<{ file_name: string; file_path: string; branch: string; url: string; markdown: string }>(result);
    expect(data.file_name).toBe('e2e-test.txt');
    expect(data.file_path).toContain('uploads/');
    expect(data.branch).toBeDefined();
    expect(data.url).toContain('uploads/');
    expect(data.markdown).toContain('e2e-test.txt');
  });
});

// Group wikis require GitLab Premium — skip on CE
describe.skip('Group Wiki tools', () => {
  it('create_group_wiki_page — creates a group wiki page', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'create_group_wiki_page',
      arguments: {
        group_id: String(globalThis.fixtures.groupId),
        title: 'E2E Group Wiki Page',
        content: '# Group Wiki\n\nCreated by E2E.',
      },
    });
    const data = extractJson<{ slug: string }>(result);
    expect(data.slug).toBeDefined();
  });

  it('list_group_wiki_pages — returns pages', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_group_wiki_pages',
      arguments: { group_id: String(globalThis.fixtures.groupId) },
    });
    const data = extractJson<Array<{ slug: string }>>(result);
    expect(data.length).toBeGreaterThan(0);
  });

  it('get_group_wiki_page — returns content', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_group_wiki_page',
      arguments: {
        group_id: String(globalThis.fixtures.groupId),
        slug: 'E2E-Group-Wiki-Page',
      },
    });
    const data = extractJson<{ content: string }>(result);
    expect(data.content).toContain('Group Wiki');
  });

  it('edit_group_wiki_page — updates content', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'edit_group_wiki_page',
      arguments: {
        group_id: String(globalThis.fixtures.groupId),
        slug: 'E2E-Group-Wiki-Page',
        content: '# Group Wiki — Updated\n\nEdited by E2E.',
      },
    });
    const data = extractJson<{ content: string }>(result);
    expect(data.content).toContain('Updated');
  });

  it('delete_group_wiki_page — removes the page', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'delete_group_wiki_page',
      arguments: {
        group_id: String(globalThis.fixtures.groupId),
        slug: 'E2E-Group-Wiki-Page',
      },
    });
    expect(extractText(result)).toBeDefined();
  });
});
