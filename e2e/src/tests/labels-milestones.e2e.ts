/**
 * E2E tests — Label & Milestone tools
 *
 * Tools tested:
 * - list_labels
 * - create_label
 * - update_label
 * - list_milestones
 * - create_milestone
 * - update_milestone
 */
import { describe, it, expect } from 'vitest';
import { extractJson } from '../helpers/types.js';

describe('Label tools', () => {
  it('list_labels — returns the provisioned label', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_labels',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ name: string }>>(result);
    expect(data.some((l) => l.name === globalThis.fixtures.labelName)).toBe(true);
  });

  it('create_label — creates a new label', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'create_label',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        name: 'e2e-priority-high',
        color: '#FF0000',
        description: 'High priority E2E label',
      },
    });
    const data = extractJson<{ name: string; color: string }>(result);
    expect(data.name).toBe('e2e-priority-high');
  });

  it('update_label — renames and recolors', async () => {
    // Get label ID first
    const listResult = await globalThis.mcpClient.callTool({
      name: 'list_labels',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const labels = extractJson<Array<{ id: number; name: string }>>(listResult);
    const label = labels.find((l) => l.name === 'e2e-priority-high');
    expect(label).toBeDefined();

    const result = await globalThis.mcpClient.callTool({
      name: 'update_label',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        label_id: label!.id,
        new_name: 'e2e-priority-critical',
        color: '#FF4500',
      },
    });
    const data = extractJson<{ name: string }>(result);
    expect(data.name).toBe('e2e-priority-critical');
  });
});

describe('Milestone tools', () => {
  it('list_milestones — returns the provisioned milestone', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_milestones',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ title: string }>>(result);
    expect(data.some((m) => m.title === globalThis.fixtures.milestoneName)).toBe(true);
  });

  it('create_milestone — creates a new milestone', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'create_milestone',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        title: 'E2E Sprint 2',
        description: 'Second sprint for E2E',
      },
    });
    const data = extractJson<{ title: string }>(result);
    expect(data.title).toBe('E2E Sprint 2');
  });

  it('update_milestone — updates description', async () => {
    // Get milestone ID
    const listResult = await globalThis.mcpClient.callTool({
      name: 'list_milestones',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const milestones = extractJson<Array<{ id: number; title: string }>>(listResult);
    const ms = milestones.find((m) => m.title === globalThis.fixtures.milestoneName);
    expect(ms).toBeDefined();

    const result = await globalThis.mcpClient.callTool({
      name: 'update_milestone',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        milestone_id: ms!.id,
        description: 'Updated by E2E test',
      },
    });
    const data = extractJson<{ description: string }>(result);
    expect(data.description).toBe('Updated by E2E test');
  });
});
