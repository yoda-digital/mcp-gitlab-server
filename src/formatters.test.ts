import { describe, it, expect } from 'vitest';
import {
  formatPipelinesResponse,
  formatJobsResponse,
  formatEnvironmentsResponse,
  formatBranchesResponse,
  formatTagsResponse,
  formatTreeResponse,
  formatReleasesResponse,
  formatLabelsResponse,
  formatMilestonesResponse,
  formatProtectedBranchesResponse,
  formatUsersResponse,
  formatGroupsResponse
} from './formatters.js';

describe('formatPipelinesResponse', () => {
  it('formats pipelines with summary', () => {
    const response = formatPipelinesResponse({
      count: 2,
      items: [
        {
          id: 1,
          project_id: 1,
          sha: 'abc123def456',
          ref: 'main',
          status: 'success',
          source: 'push',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          web_url: 'https://gitlab.com/pipelines/1',
          duration: 120
        },
        {
          id: 2,
          project_id: 1,
          sha: 'def456abc123',
          ref: 'develop',
          status: 'failed',
          source: 'web',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          web_url: 'https://gitlab.com/pipelines/2',
          duration: 60
        }
      ]
    });

    expect(response.content).toHaveLength(2);
    expect(response.content[0].text).toBe('Found 2 pipelines');

    const items = JSON.parse(response.content[1].text);
    expect(items).toHaveLength(2);
    expect(items[0].sha).toBe('abc123de'); // Truncated to 8 chars
    expect(items[0].status).toBe('success');
  });
});

describe('formatJobsResponse', () => {
  it('formats jobs with summary', () => {
    const response = formatJobsResponse({
      count: 1,
      items: [
        {
          id: 1,
          status: 'success',
          stage: 'build',
          name: 'build-job',
          ref: 'main',
          tag: false,
          created_at: '2024-01-01T00:00:00Z',
          web_url: 'https://gitlab.com/jobs/1',
          duration: 30
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 1 jobs');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].name).toBe('build-job');
    expect(items[0].stage).toBe('build');
  });
});

describe('formatEnvironmentsResponse', () => {
  it('formats environments with summary', () => {
    const response = formatEnvironmentsResponse({
      count: 2,
      items: [
        {
          id: 1,
          name: 'production',
          slug: 'production',
          state: 'available'
        },
        {
          id: 2,
          name: 'staging',
          slug: 'staging',
          state: 'stopped'
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 2 environments');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].name).toBe('production');
    expect(items[0].state).toBe('available');
  });
});

describe('formatBranchesResponse', () => {
  it('formats branches with summary', () => {
    const response = formatBranchesResponse({
      count: 1,
      items: [
        {
          name: 'main',
          protected: true,
          commit: {
            id: 'abc123',
            short_id: 'abc123',
            title: 'Initial commit',
            created_at: '2024-01-01T00:00:00Z',
            author_name: 'Test User'
          }
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 1 branches');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].name).toBe('main');
    expect(items[0].protected).toBe(true);
  });
});

describe('formatTagsResponse', () => {
  it('formats tags with summary', () => {
    const response = formatTagsResponse({
      count: 1,
      items: [
        {
          name: 'v1.0.0',
          message: 'Release version 1.0.0',
          protected: false,
          commit: {
            id: 'abc123',
            short_id: 'abc123',
            title: 'Release commit',
            created_at: '2024-01-01T00:00:00Z'
          }
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 1 tags');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].name).toBe('v1.0.0');
    expect(items[0].message).toBe('Release version 1.0.0');
  });
});

describe('formatTreeResponse', () => {
  it('formats tree items with summary', () => {
    const response = formatTreeResponse({
      count: 3,
      items: [
        { id: '1', name: 'src', type: 'tree', path: 'src', mode: '040000' },
        { id: '2', name: 'README.md', type: 'blob', path: 'README.md', mode: '100644' },
        { id: '3', name: 'package.json', type: 'blob', path: 'package.json', mode: '100644' }
      ]
    });

    expect(response.content[0].text).toBe('Found 3 items');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].type).toBe('tree');
    expect(items[1].type).toBe('blob');
  });
});

describe('formatReleasesResponse', () => {
  it('formats releases with summary', () => {
    const response = formatReleasesResponse({
      count: 1,
      items: [
        {
          tag_name: 'v1.0.0',
          name: 'Version 1.0.0',
          description: 'First release',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 1 releases');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].tag_name).toBe('v1.0.0');
    expect(items[0].name).toBe('Version 1.0.0');
  });

  it('truncates long descriptions', () => {
    const longDescription = 'A'.repeat(200);
    const response = formatReleasesResponse({
      count: 1,
      items: [
        {
          tag_name: 'v1.0.0',
          name: null,
          description: longDescription,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]
    });

    const items = JSON.parse(response.content[1].text);
    expect(items[0].description.length).toBeLessThan(longDescription.length);
    expect(items[0].description.endsWith('...')).toBe(true);
  });
});

describe('formatLabelsResponse', () => {
  it('formats labels with summary', () => {
    const response = formatLabelsResponse({
      count: 2,
      items: [
        {
          id: 1,
          name: 'bug',
          color: '#FF0000',
          description: 'Bug reports'
        },
        {
          id: 2,
          name: 'feature',
          color: '#00FF00',
          description: 'Feature requests'
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 2 labels');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].name).toBe('bug');
    expect(items[0].color).toBe('#FF0000');
  });
});

describe('formatMilestonesResponse', () => {
  it('formats milestones with summary', () => {
    const response = formatMilestonesResponse({
      count: 1,
      items: [
        {
          id: 1,
          iid: 1,
          title: 'v1.0',
          description: 'First milestone',
          state: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          due_date: '2024-06-01',
          start_date: '2024-01-01',
          web_url: 'https://gitlab.com/milestones/1'
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 1 milestones');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].title).toBe('v1.0');
    expect(items[0].state).toBe('active');
  });
});

describe('formatProtectedBranchesResponse', () => {
  it('formats protected branches with summary', () => {
    const response = formatProtectedBranchesResponse({
      count: 1,
      items: [
        {
          id: 1,
          name: 'main',
          push_access_levels: [{ access_level: 40, access_level_description: 'Maintainers' }],
          merge_access_levels: [{ access_level: 30, access_level_description: 'Developers + Maintainers' }],
          allow_force_push: false
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 1 protected branches');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].name).toBe('main');
    expect(items[0].push_access_levels).toContain('Maintainers');
  });
});

describe('formatUsersResponse', () => {
  it('formats users with summary', () => {
    const response = formatUsersResponse({
      count: 1,
      items: [
        {
          id: 1,
          username: 'testuser',
          name: 'Test User',
          state: 'active',
          avatar_url: 'https://gitlab.com/avatar.png',
          web_url: 'https://gitlab.com/testuser'
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 1 users');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].username).toBe('testuser');
    expect(items[0].name).toBe('Test User');
  });
});

describe('formatGroupsResponse', () => {
  it('formats groups with summary', () => {
    const response = formatGroupsResponse({
      count: 2,
      items: [
        {
          id: 1,
          name: 'Group One',
          path: 'group-one',
          full_path: 'group-one',
          description: 'First group',
          visibility: 'private',
          web_url: 'https://gitlab.com/group-one'
        },
        {
          id: 2,
          name: 'Subgroup',
          path: 'subgroup',
          full_path: 'group-one/subgroup',
          description: 'A subgroup',
          visibility: 'internal',
          parent_id: 1,
          web_url: 'https://gitlab.com/group-one/subgroup'
        }
      ]
    });

    expect(response.content[0].text).toBe('Found 2 groups');

    const items = JSON.parse(response.content[1].text);
    expect(items[0].name).toBe('Group One');
    expect(items[1].parent_id).toBe(1);
  });
});
