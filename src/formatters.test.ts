import { describe, it, expect } from 'vitest';
import {
  formatEventsResponse,
  formatCommitsResponse,
  formatIssuesResponse,
  formatMergeRequestsResponse,
  formatWikiPagesResponse,
  formatWikiPageResponse,
  formatWikiAttachmentResponse,
  formatMembersResponse,
  formatNotesResponse,
  formatDiscussionsResponse,
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

// =============================================================================
// Previously uncovered formatters
// =============================================================================

describe('formatEventsResponse', () => {
  it('formats events with action, author, and push_data', () => {
    const response = formatEventsResponse({
      count: 2,
      items: [
        {
          id: 1,
          action_name: 'pushed to',
          author: { id: 1, name: 'Dev', username: 'dev' },
          created_at: '2026-01-01T00:00:00Z',
          target_type: 'branch',
          target_title: 'main',
          push_data: { commit_count: 3, ref: 'main', ref_type: 'branch' },
        },
        {
          id: 2,
          action_name: 'opened',
          author: { id: 2, name: 'PM', username: 'pm' },
          created_at: '2026-01-02T00:00:00Z',
          target_type: 'Issue',
          target_title: 'Bug fix',
          push_data: null,
        },
      ],
    });

    expect(response.content[0].text).toBe('Found 2 events');
    const items = JSON.parse(response.content[1].text);
    expect(items[0].action).toBe('pushed to');
    expect(items[0].author).toBe('Dev');
    expect(items[0].push_data.commit_count).toBe(3);
    expect(items[1].target_title).toBe('Bug fix');
  });
});

describe('formatCommitsResponse', () => {
  it('formats commits with author and stats', () => {
    const response = formatCommitsResponse({
      count: 1,
      items: [
        {
          id: 'abc123def456',
          short_id: 'abc123de',
          title: 'feat: add login',
          message: 'feat: add login\n\nDetailed description',
          author_name: 'Tester',
          author_email: 'test@example.com',
          created_at: '2026-01-01T00:00:00Z',
          web_url: 'https://gitlab.com/commit/abc123',
          stats: { additions: 50, deletions: 10, total: 60 },
        },
      ],
    });

    expect(response.content[0].text).toBe('Found 1 commits');
    const items = JSON.parse(response.content[1].text);
    expect(items[0].author_name).toBe('Tester');
    expect(items[0].stats.additions).toBe(50);
  });
});

describe('formatIssuesResponse', () => {
  it('formats issues with labels, author and assignees', () => {
    const response = formatIssuesResponse({
      count: 1,
      items: [
        {
          id: 101,
          iid: 5,
          project_id: 1,
          title: 'Critical Bug',
          description: 'Something broke',
          state: 'opened',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          closed_at: null,
          labels: ['bug', 'priority::critical'],
          author: { id: 1, name: 'Reporter', username: 'reporter' },
          assignees: [{ id: 2, name: 'Fixer', username: 'fixer' }],
          web_url: 'https://gitlab.com/issues/5',
        },
      ],
    });

    expect(response.content[0].text).toBe('Found 1 issues');
    const items = JSON.parse(response.content[1].text);
    expect(items[0].title).toBe('Critical Bug');
    expect(items[0].labels).toEqual(['bug', 'priority::critical']);
    expect(items[0].assignees[0].username).toBe('fixer');
  });
});

describe('formatMergeRequestsResponse', () => {
  it('formats merge requests with branches and author', () => {
    const response = formatMergeRequestsResponse({
      count: 1,
      items: [
        {
          id: 201,
          iid: 10,
          project_id: 1,
          title: 'Add feature X',
          description: 'Implements feature X',
          state: 'merged',
          merged: true,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-03T00:00:00Z',
          merged_at: '2026-01-03T00:00:00Z',
          closed_at: null,
          source_branch: 'feat/x',
          target_branch: 'main',
          author: { id: 1, name: 'Dev', username: 'dev' },
          assignees: [],
          web_url: 'https://gitlab.com/mr/10',
          diff_refs: null,
          merge_commit_sha: 'sha123',
        },
      ],
    });

    expect(response.content[0].text).toBe('Found 1 merge requests');
    const items = JSON.parse(response.content[1].text);
    expect(items[0].source_branch).toBe('feat/x');
    expect(items[0].target_branch).toBe('main');
    expect(items[0].merged).toBe(true);
  });
});

describe('formatWikiPagesResponse', () => {
  it('formats wiki pages and truncates long content', () => {
    const longContent = 'X'.repeat(200);
    const response = formatWikiPagesResponse({
      count: 2,
      items: [
        {
          slug: 'home',
          title: 'Home',
          format: 'markdown',
          content: 'Short',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          web_url: 'https://gitlab.com/wiki/home',
        },
        {
          slug: 'long-page',
          title: 'Long Page',
          format: 'markdown',
          content: longContent,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          web_url: 'https://gitlab.com/wiki/long-page',
        },
      ],
    });

    expect(response.content[0].text).toBe('Found 2 wiki pages');
    const items = JSON.parse(response.content[1].text);
    expect(items[0].content).toBe('Short');
    expect(items[1].content.length).toBeLessThan(200);
    expect(items[1].content.endsWith('...')).toBe(true);
  });

  it('handles null content gracefully', () => {
    const response = formatWikiPagesResponse({
      count: 1,
      items: [
        {
          slug: 'empty',
          title: 'Empty',
          format: 'markdown',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          web_url: 'https://gitlab.com/wiki/empty',
        },
      ],
    });

    const items = JSON.parse(response.content[1].text);
    expect(items[0].content).toBeNull();
  });
});

describe('formatWikiPageResponse', () => {
  it('formats a single wiki page with title header', () => {
    const response = formatWikiPageResponse({
      slug: 'getting-started',
      title: 'Getting Started',
      format: 'markdown',
      content: '# Welcome\nThis is the guide.',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      web_url: 'https://gitlab.com/wiki/getting-started',
    });

    expect(response.content[0].text).toBe('Wiki Page: Getting Started');
    const page = JSON.parse(response.content[1].text);
    expect(page.slug).toBe('getting-started');
    expect(page.content).toContain('# Welcome');
  });
});

describe('formatWikiAttachmentResponse', () => {
  it('formats attachment with file info and markdown link', () => {
    const response = formatWikiAttachmentResponse({
      file_name: 'diagram.png',
      file_path: 'uploads/abc/diagram.png',
      branch: 'main',
      link: {
        url: '/uploads/abc/diagram.png',
        markdown: '![diagram](uploads/abc/diagram.png)',
      },
    });

    expect(response.content[0].text).toBe('Wiki Attachment: diagram.png');
    const attachment = JSON.parse(response.content[1].text);
    expect(attachment.file_name).toBe('diagram.png');
    expect(attachment.markdown).toContain('![diagram]');
  });
});

describe('formatMembersResponse', () => {
  it('formats members with access level info', () => {
    const response = formatMembersResponse({
      count: 2,
      items: [
        {
          id: 1,
          username: 'admin',
          name: 'Admin User',
          state: 'active',
          avatar_url: 'https://gitlab.com/avatar1.png',
          web_url: 'https://gitlab.com/admin',
          access_level: 50,
          access_level_description: 'Owner',
          expires_at: null,
        },
        {
          id: 2,
          username: 'dev',
          name: 'Developer',
          state: 'active',
          avatar_url: 'https://gitlab.com/avatar2.png',
          web_url: 'https://gitlab.com/dev',
          access_level: 30,
          access_level_description: 'Developer',
          expires_at: '2026-12-31',
        },
      ],
    });

    expect(response.content[0].text).toBe('Found 2 members');
    const items = JSON.parse(response.content[1].text);
    expect(items[0].access_level_description).toBe('Owner');
    expect(items[1].expires_at).toBe('2026-12-31');
  });
});

describe('formatNotesResponse', () => {
  it('formats notes with system flag and type inference', () => {
    const response = formatNotesResponse({
      count: 2,
      items: [
        {
          id: 1,
          body: 'This looks good!',
          author: { id: 1, name: 'Reviewer', username: 'reviewer' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          system: false,
          noteable_id: 5,
          noteable_type: 'MergeRequest',
          noteable_iid: 10,
        },
        {
          id: 2,
          body: 'merged',
          author: { id: 0, name: 'System', username: 'system' },
          created_at: '2026-01-02T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          system: true,
          noteable_id: 5,
          noteable_type: 'MergeRequest',
          noteable_iid: 10,
        },
      ],
    });

    expect(response.content[0].text).toBe('Found 2 notes');
    const items = JSON.parse(response.content[1].text);
    expect(items[0].type).toBe('comment');
    expect(items[0].system).toBe(false);
    expect(items[1].type).toBe('system');
    expect(items[1].system).toBe(true);
  });
});

describe('formatDiscussionsResponse', () => {
  it('formats discussions with nested notes', () => {
    const response = formatDiscussionsResponse({
      count: 1,
      items: [
        {
          id: 'disc-1',
          individual_note: false,
          notes: [
            {
              id: 1,
              body: 'Can we refactor this?',
              author: { id: 1, name: 'Reviewer', username: 'reviewer' },
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
              system: false,
              noteable_id: 5,
              noteable_type: 'MergeRequest',
              noteable_iid: 10,
            },
            {
              id: 2,
              body: 'Done in next commit',
              author: { id: 2, name: 'Dev', username: 'dev' },
              created_at: '2026-01-02T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
              system: false,
              noteable_id: 5,
              noteable_type: 'MergeRequest',
              noteable_iid: 10,
            },
          ],
        },
      ],
    });

    expect(response.content[0].text).toBe('Found 1 discussions');
    const items = JSON.parse(response.content[1].text);
    expect(items[0].individual_note).toBe(false);
    expect(items[0].notes).toHaveLength(2);
    expect(items[0].notes[0].body).toBe('Can we refactor this?');
    expect(items[0].notes[1].author.username).toBe('dev');
  });
});
