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
  formatGroupsResponse,
  formatIssuesResponse,
  formatMergeRequestsResponse,
  formatNotesResponse,
  formatDiscussionsResponse,
  formatEventsResponse,
  formatCommitsResponse,
  formatMembersResponse,
  formatWikiPagesResponse,
  formatWikiPageResponse,
  formatWikiAttachmentResponse
} from './formatters.js';

/** Helper: parse the single JSON content item returned by all formatters. */
function parseResponse(response: { content: Array<{ type: string; text: string }> }) {
  expect(response.content).toHaveLength(1);
  expect(response.content[0].type).toBe('text');
  return JSON.parse(response.content[0].text);
}

describe('formatPipelinesResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(2);
    expect(data.items).toHaveLength(2);
    expect(data.items[0].sha).toBe('abc123de'); // Truncated to 8 chars
    expect(data.items[0].status).toBe('success');
  });
});

describe('formatJobsResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(1);
    expect(data.items[0].name).toBe('build-job');
    expect(data.items[0].stage).toBe('build');
  });
});

describe('formatEnvironmentsResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(2);
    expect(data.items[0].name).toBe('production');
    expect(data.items[0].state).toBe('available');
  });
});

describe('formatBranchesResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(1);
    expect(data.items[0].name).toBe('main');
    expect(data.items[0].protected).toBe(true);
  });
});

describe('formatTagsResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(1);
    expect(data.items[0].name).toBe('v1.0.0');
    expect(data.items[0].message).toBe('Release version 1.0.0');
  });
});

describe('formatTreeResponse', () => {
  it('returns structured JSON with count and items', () => {
    const response = formatTreeResponse({
      count: 3,
      items: [
        { id: '1', name: 'src', type: 'tree', path: 'src', mode: '040000' },
        { id: '2', name: 'README.md', type: 'blob', path: 'README.md', mode: '100644' },
        { id: '3', name: 'package.json', type: 'blob', path: 'package.json', mode: '100644' }
      ]
    });

    const data = parseResponse(response);
    expect(data.count).toBe(3);
    expect(data.items[0].type).toBe('tree');
    expect(data.items[1].type).toBe('blob');
  });
});

describe('formatReleasesResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(1);
    expect(data.items[0].tag_name).toBe('v1.0.0');
    expect(data.items[0].name).toBe('Version 1.0.0');
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

    const data = parseResponse(response);
    expect(data.items[0].description.length).toBeLessThan(longDescription.length);
    expect(data.items[0].description.endsWith('...')).toBe(true);
  });
});

describe('formatLabelsResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(2);
    expect(data.items[0].name).toBe('bug');
    expect(data.items[0].color).toBe('#FF0000');
  });
});

describe('formatMilestonesResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(1);
    expect(data.items[0].title).toBe('v1.0');
    expect(data.items[0].state).toBe('active');
  });
});

describe('formatProtectedBranchesResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(1);
    expect(data.items[0].name).toBe('main');
    expect(data.items[0].push_access_levels).toContain('Maintainers');
  });
});

describe('formatUsersResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(1);
    expect(data.items[0].username).toBe('testuser');
    expect(data.items[0].name).toBe('Test User');
  });
});

describe('formatGroupsResponse', () => {
  it('returns structured JSON with count and items', () => {
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

    const data = parseResponse(response);
    expect(data.count).toBe(2);
    expect(data.items[0].name).toBe('Group One');
    expect(data.items[1].parent_id).toBe(1);
  });
});

describe('formatIssuesResponse', () => {
  it('returns structured JSON with count and items including all fields', () => {
    const response = formatIssuesResponse({
      count: 1,
      items: [
        {
          id: 100,
          iid: 1,
          project_id: 42,
          title: 'Test issue',
          description: 'A bug description',
          state: 'opened',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          closed_at: null,
          labels: ['bug'],
          author: { id: 1, name: 'Alice', username: 'alice', avatar_url: '', web_url: '' },
          assignees: [{ id: 2, name: 'Bob', username: 'bob', avatar_url: '', web_url: '' }],
          web_url: 'https://gitlab.com/issues/1'
        }
      ]
    });

    const data = parseResponse(response);
    expect(data.count).toBe(1);
    expect(data.items[0].iid).toBe(1);
    expect(data.items[0].title).toBe('Test issue');
    expect(data.items[0].description).toBe('A bug description');
    expect(data.items[0].state).toBe('opened');
    expect(data.items[0].labels).toEqual(['bug']);
    expect(data.items[0].author.username).toBe('alice');
    expect(data.items[0].assignees[0].username).toBe('bob');
  });
});

describe('formatEventsResponse', () => {
  it('returns structured JSON with count and items', () => {
    const response = formatEventsResponse({
      count: 1,
      items: [
        {
          id: 1,
          action_name: 'pushed to',
          author: { id: 1, name: 'Alice', username: 'alice', avatar_url: '', web_url: '' },
          created_at: '2024-01-01T00:00:00Z',
          target_type: 'MergeRequest',
          target_title: 'Fix bug'
        }
      ]
    });

    const data = parseResponse(response);
    expect(data.count).toBe(1);
    expect(data.items[0].action).toBe('pushed to');
    expect(data.items[0].author).toBe('Alice');
  });
});

describe('formatWikiPageResponse', () => {
  it('returns single wiki page as structured JSON', () => {
    const response = formatWikiPageResponse({
      slug: 'home',
      title: 'Home',
      format: 'markdown',
      content: '# Welcome',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      web_url: 'https://gitlab.com/wiki/home'
    });

    const data = parseResponse(response);
    expect(data.title).toBe('Home');
    expect(data.content).toBe('# Welcome');
  });
});

describe('formatWikiAttachmentResponse', () => {
  it('returns attachment info as structured JSON', () => {
    const response = formatWikiAttachmentResponse({
      file_name: 'image.png',
      file_path: 'uploads/image.png',
      branch: 'main',
      link: { url: '/uploads/image.png', markdown: '![image](uploads/image.png)' }
    });

    const data = parseResponse(response);
    expect(data.file_name).toBe('image.png');
    expect(data.url).toBe('/uploads/image.png');
    expect(data.markdown).toContain('image');
  });
});
