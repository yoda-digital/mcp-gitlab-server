import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

vi.mock('node-fetch', () => ({ default: vi.fn() }));

import fetch from 'node-fetch';
import { GitLabApi } from './gitlab-api.js';

const fetchMock = vi.mocked(fetch);
const API_URL = 'https://gitlab.example/api/v4';

function mockResponse(data: unknown, opts: { ok?: boolean; status?: number; statusText?: string; headers?: Record<string, string>; text?: string } = {}) {
  const { ok = true, status = 200, statusText = 'OK', headers = {}, text } = opts;
  fetchMock.mockResolvedValueOnce({
    ok,
    status,
    statusText,
    headers: { get: (h: string) => headers[h] ?? null },
    json: async () => data,
    text: text !== undefined ? async () => text : async () => JSON.stringify(data),
  } as unknown as Awaited<ReturnType<typeof fetch>>);
}

function mockError(status: number, statusText: string) {
  mockResponse(null, { ok: false, status, statusText });
}

function makeApi() {
  return new GitLabApi({ apiUrl: API_URL, token: 'test-token' });
}

function makeIssue(iid: number) {
  return {
    id: 1000 + iid,
    iid,
    project_id: 1,
    title: `Issue ${iid}`,
    description: null,
    state: 'opened',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    closed_at: null,
    labels: [],
    assignees: [],
    author: { id: 1, name: 'Tester', username: 'tester' },
    web_url: `https://gitlab.example/proj/-/issues/${iid}`,
  };
}

function makeMergeRequest(iid: number) {
  return {
    id: 2000 + iid,
    iid,
    project_id: 1,
    title: `MR ${iid}`,
    description: null,
    state: 'opened',
    merged: false,
    author: { id: 1, name: 'Tester', username: 'tester' },
    assignees: [],
    source_branch: 'feature',
    target_branch: 'main',
    diff_refs: null,
    web_url: `https://gitlab.example/proj/-/merge_requests/${iid}`,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    merged_at: null,
    closed_at: null,
    merge_commit_sha: null,
  };
}

function makeNote(id: number) {
  return {
    id,
    body: `Note ${id}`,
    author: { id: 1, name: 'Tester', username: 'tester' },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    system: false,
    noteable_id: 1,
    noteable_type: 'Issue',
    noteable_iid: 1,
  };
}

function makeCommit(id: string = 'abc123') {
  return {
    id,
    short_id: id.substring(0, 8),
    title: 'test commit',
    message: 'test commit',
    author_name: 'Tester',
    author_email: 'test@example.com',
    authored_date: '2026-01-01T00:00:00Z',
    committer_name: 'Tester',
    committer_email: 'test@example.com',
    committed_date: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    web_url: `https://gitlab.example/proj/-/commit/${id}`,
  };
}

function makePipeline(id: number) {
  return {
    id,
    project_id: 1,
    sha: 'abc123def456',
    ref: 'main',
    status: 'success',
    source: 'push',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    web_url: `https://gitlab.example/proj/-/pipelines/${id}`,
    duration: 120,
  };
}

function makeJob(id: number) {
  return {
    id,
    status: 'success',
    stage: 'build',
    name: `job-${id}`,
    ref: 'main',
    tag: false,
    created_at: '2026-01-01T00:00:00Z',
    web_url: `https://gitlab.example/proj/-/jobs/${id}`,
    duration: 30,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

// =============================================================================
// Core methods: file operations & branching
// =============================================================================

describe('GitLabApi.getFileContents', () => {
  it('decodes base64 content from API response', async () => {
    const api = makeApi();
    const encoded = Buffer.from('Hello World').toString('base64');
    mockResponse({
      file_name: 'README.md',
      file_path: 'README.md',
      size: 11,
      encoding: 'base64',
      content: encoded,
      ref: 'main',
      blob_id: 'abc',
      commit_id: 'def',
      last_commit_id: 'ghi',
    });

    const result = await api.getFileContents('my-proj', 'README.md', 'main');

    expect(result.content).toBe('Hello World');
  });

  it('URL-encodes file path and ref', async () => {
    const api = makeApi();
    mockResponse({
      file_name: 'config.yaml',
      file_path: 'src/config.yaml',
      size: 5,
      encoding: 'base64',
      content: Buffer.from('test').toString('base64'),
      ref: 'feat/branch',
      blob_id: 'abc',
      commit_id: 'def',
      last_commit_id: 'ghi',
    });

    await api.getFileContents('my/project', 'src/config.yaml', 'feat/branch');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('projects/my%2Fproject');
    expect(url).toContain('src%2Fconfig.yaml');
    expect(url).toContain('ref=feat%2Fbranch');
  });

  it('throws McpError on API failure', async () => {
    const api = makeApi();
    mockError(404, 'Not Found');

    await expect(api.getFileContents('proj', 'missing.txt', 'main'))
      .rejects.toThrow('GitLab API error: Not Found');
  });
});

describe('GitLabApi.createOrUpdateFile', () => {
  it('uses POST when file does not exist', async () => {
    const api = makeApi();
    // First call: getFileContents fails (file doesn't exist)
    mockError(404, 'Not Found');
    // Second call: POST creates the file
    mockResponse({ file_path: 'new.txt', branch: 'main', commit_id: 'sha1' });

    const result = await api.createOrUpdateFile('proj', 'new.txt', 'content', 'add file', 'main');

    expect(result.file_path).toBe('new.txt');
    // Second fetch call should be POST
    const createCall = fetchMock.mock.calls[1];
    expect((createCall[1] as any).method).toBe('POST');
  });

  it('uses PUT when file already exists', async () => {
    const api = makeApi();
    // First call: getFileContents succeeds (file exists)
    mockResponse({
      file_name: 'existing.txt',
      file_path: 'existing.txt',
      size: 10,
      encoding: 'base64',
      content: Buffer.from('old').toString('base64'),
      ref: 'main',
      blob_id: 'a',
      commit_id: 'b',
      last_commit_id: 'c',
    });
    // Second call: PUT updates the file
    mockResponse({ file_path: 'existing.txt', branch: 'main', commit_id: 'sha2' });

    const result = await api.createOrUpdateFile('proj', 'existing.txt', 'new content', 'update', 'main');

    expect(result.file_path).toBe('existing.txt');
    const updateCall = fetchMock.mock.calls[1];
    expect((updateCall[1] as any).method).toBe('PUT');
  });

  it('includes previousPath when renaming', async () => {
    const api = makeApi();
    mockError(404, 'Not Found');
    mockResponse({ file_path: 'new-name.txt', branch: 'main', commit_id: 'sha3' });

    await api.createOrUpdateFile('proj', 'new-name.txt', 'content', 'rename', 'main', 'old-name.txt');

    const body = JSON.parse((fetchMock.mock.calls[1][1] as any).body);
    expect(body.previous_path).toBe('old-name.txt');
  });
});

describe('GitLabApi.createCommit', () => {
  it('maps FileOperation array to actions with action:create', async () => {
    const api = makeApi();
    mockResponse(makeCommit('deadbeef'));

    await api.createCommit('proj', 'bulk add', 'main', [
      { path: 'file1.ts', content: 'console.log(1)' },
      { path: 'file2.ts', content: 'console.log(2)' },
    ]);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.actions).toHaveLength(2);
    expect(body.actions[0]).toEqual({ action: 'create', file_path: 'file1.ts', content: 'console.log(1)' });
    expect(body.actions[1]).toEqual({ action: 'create', file_path: 'file2.ts', content: 'console.log(2)' });
  });
});

// =============================================================================
// URL construction & query params
// =============================================================================

describe('GitLabApi.searchProjects', () => {
  it('constructs URL with search, page, per_page params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.searchProjects('my-app', 2, 50);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('search=my-app');
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=50');
  });
});

describe('GitLabApi.listGroupProjects', () => {
  it('appends all provided options as query params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '5' } });

    await api.listGroupProjects('my-group', {
      archived: false,
      visibility: 'private',
      include_subgroups: true,
      page: 1,
      per_page: 10,
    });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('archived=false');
    expect(url).toContain('visibility=private');
    expect(url).toContain('include_subgroups=true');
  });
});

describe('GitLabApi.listCommits', () => {
  it('sends since/until/path options as query params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listCommits('proj', { since: '2026-01-01', until: '2026-02-01', path: 'src/' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('since=2026-01-01');
    expect(url).toContain('until=2026-02-01');
    expect(url).toContain('path=src%2F');
  });
});

// =============================================================================
// Issues
// =============================================================================

describe('GitLabApi.listIssues', () => {
  it('filters by iid server-side via iids[] query param', async () => {
    const api = makeApi();
    mockResponse([makeIssue(42)], { headers: { 'X-Total': '1' } });

    await api.listIssues('my-proj', { iid: 42 });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('iids%5B%5D=42');
  });

  it('omits iids[] when iid is not provided', async () => {
    const api = makeApi();
    mockResponse([makeIssue(1), makeIssue(2)], { headers: { 'X-Total': '2' } });

    await api.listIssues('my-proj');

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).not.toContain('iids');
  });

  it('returns items without client-side filtering', async () => {
    const api = makeApi();
    mockResponse([makeIssue(7)], { headers: { 'X-Total': '1' } });

    const result = await api.listIssues('my-proj', { iid: 99 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].iid).toBe(7);
  });
});

describe('GitLabApi.createIssue', () => {
  it('joins labels array with comma in request body', async () => {
    const api = makeApi();
    mockResponse(makeIssue(10));

    await api.createIssue('proj', {
      title: 'Bug',
      labels: ['bug', 'priority::high', 'team::backend'],
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.labels).toBe('bug,priority::high,team::backend');
  });

  it('sends assignee_ids and milestone_id', async () => {
    const api = makeApi();
    mockResponse(makeIssue(11));

    await api.createIssue('proj', {
      title: 'Feature',
      assignee_ids: [10, 20],
      milestone_id: 5,
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.assignee_ids).toEqual([10, 20]);
    expect(body.milestone_id).toBe(5);
  });
});

// =============================================================================
// Merge Requests
// =============================================================================

describe('GitLabApi.listMergeRequests', () => {
  it('passes state and branch filters', async () => {
    const api = makeApi();
    mockResponse([makeMergeRequest(1)], { headers: { 'X-Total': '1' } });

    await api.listMergeRequests('proj', { state: 'opened', source_branch: 'feat/x' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('state=opened');
    expect(url).toContain('source_branch=feat%2Fx');
  });
});

describe('GitLabApi.createMergeRequest', () => {
  it('maps response fields correctly', async () => {
    const api = makeApi();
    mockResponse(makeMergeRequest(5));

    const result = await api.createMergeRequest('proj', {
      title: 'My MR',
      source_branch: 'feature',
      target_branch: 'main',
      draft: true,
    });

    expect(result.iid).toBe(5);
    expect(result.source_branch).toBe('feature');
    expect(result.target_branch).toBe('main');
  });
});

// =============================================================================
// Error handling with specific HTTP status codes
// =============================================================================

describe('GitLabApi.getIssueNotes — error handling', () => {
  it('returns specific message on 404', async () => {
    const api = makeApi();
    mockError(404, 'Not Found');

    await expect(api.getIssueNotes('proj', 99))
      .rejects.toThrow('Issue not found: Project ID proj, Issue IID 99');
  });

  it('returns specific message on 403', async () => {
    const api = makeApi();
    mockError(403, 'Forbidden');

    await expect(api.getIssueNotes('proj', 1))
      .rejects.toThrow('Permission denied to access issue notes');
  });

  it('returns specific message on 429', async () => {
    const api = makeApi();
    mockError(429, 'Too Many Requests');

    await expect(api.getIssueNotes('proj', 1))
      .rejects.toThrow('GitLab API rate limit exceeded');
  });

  it('returns notes on success', async () => {
    const api = makeApi();
    mockResponse([makeNote(1), makeNote(2)], { headers: { 'X-Total': '2' } });

    const result = await api.getIssueNotes('proj', 1);

    expect(result.count).toBe(2);
    expect(result.items).toHaveLength(2);
  });
});

describe('GitLabApi.approveMergeRequest — error handling', () => {
  it('returns specific message on 401', async () => {
    const api = makeApi();
    mockError(401, 'Unauthorized');

    await expect(api.approveMergeRequest('proj', 1))
      .rejects.toThrow("Unauthorized: You don't have permission to approve this merge request");
  });

  it('returns specific message on 409 (SHA mismatch)', async () => {
    const api = makeApi();
    mockError(409, 'Conflict');

    await expect(api.approveMergeRequest('proj', 1, 'old-sha'))
      .rejects.toThrow('SHA mismatch');
  });

  it('sends sha in body when provided', async () => {
    const api = makeApi();
    mockResponse(makeMergeRequest(1));

    await api.approveMergeRequest('proj', 1, 'abc123');

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.sha).toBe('abc123');
  });

  it('sends empty body when no sha', async () => {
    const api = makeApi();
    mockResponse(makeMergeRequest(1));

    await api.approveMergeRequest('proj', 1);

    // body should be undefined (no keys)
    expect((fetchMock.mock.calls[0][1] as any).body).toBeUndefined();
  });
});

describe('GitLabApi.mergeMergeRequest — error handling', () => {
  it('returns specific message on 405 (not mergeable)', async () => {
    const api = makeApi();
    mockError(405, 'Method Not Allowed');

    await expect(api.mergeMergeRequest('proj', 1))
      .rejects.toThrow('Cannot merge: The merge request is in a state that cannot be merged');
  });

  it('returns specific message on 406 (conflicts)', async () => {
    const api = makeApi();
    mockError(406, 'Not Acceptable');

    await expect(api.mergeMergeRequest('proj', 1))
      .rejects.toThrow('Cannot merge: There are conflicts between source and target branches');
  });

  it('passes squash and remove_source_branch options', async () => {
    const api = makeApi();
    mockResponse(makeMergeRequest(1));

    await api.mergeMergeRequest('proj', 1, { squash: true, should_remove_source_branch: true });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.squash).toBe(true);
    expect(body.should_remove_source_branch).toBe(true);
  });
});

// =============================================================================
// CI/CD: Pipelines & Jobs
// =============================================================================

describe('GitLabApi.listPipelines', () => {
  it('returns parsed pipeline list with count from X-Total', async () => {
    const api = makeApi();
    mockResponse([makePipeline(1), makePipeline(2)], { headers: { 'X-Total': '10' } });

    const result = await api.listPipelines('proj', { status: 'success', ref: 'main' });

    expect(result.count).toBe(10);
    expect(result.items).toHaveLength(2);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('status=success');
    expect(url).toContain('ref=main');
  });
});

describe('GitLabApi.getPipeline', () => {
  it('fetches single pipeline by ID', async () => {
    const api = makeApi();
    mockResponse(makePipeline(42));

    const result = await api.getPipeline('proj', 42);

    expect(result.id).toBe(42);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/pipelines/42');
  });
});

describe('GitLabApi.triggerPipeline', () => {
  it('sends ref and variables in body', async () => {
    const api = makeApi();
    mockResponse(makePipeline(100));

    await api.triggerPipeline('proj', 'main', [{ key: 'ENV', value: 'prod' }]);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.ref).toBe('main');
    expect(body.variables).toEqual([{ key: 'ENV', value: 'prod' }]);
  });
});

describe('GitLabApi.listPipelineJobs', () => {
  it('appends scope[] params correctly', async () => {
    const api = makeApi();
    mockResponse([makeJob(1)], { headers: { 'X-Total': '1' } });

    await api.listPipelineJobs('proj', 42, { scope: ['success', 'failed'] });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('scope%5B%5D=success');
    expect(url).toContain('scope%5B%5D=failed');
  });
});

describe('GitLabApi.getJobLog', () => {
  it('returns raw text (not JSON)', async () => {
    const api = makeApi();
    const logText = '[2026-01-01] Build succeeded\nDone.';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => null },
      text: async () => logText,
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const result = await api.getJobLog('proj', 77);

    expect(result).toBe(logText);
  });
});

describe('GitLabApi.retryJob', () => {
  it('POSTs to retry endpoint', async () => {
    const api = makeApi();
    mockResponse(makeJob(77));

    await api.retryJob('proj', 77);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/jobs/77/retry');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('POST');
  });
});

describe('GitLabApi.cancelPipeline', () => {
  it('POSTs to cancel endpoint', async () => {
    const api = makeApi();
    mockResponse(makePipeline(55));

    await api.cancelPipeline('proj', 55);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/pipelines/55/cancel');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('POST');
  });
});

// =============================================================================
// Repository: Branches, Tags, Tree
// =============================================================================

describe('GitLabApi.createBranch', () => {
  it('sends branch name and ref in body', async () => {
    const api = makeApi();
    mockResponse({
      name: 'feat/x',
      commit: { id: 'abc123', short_id: 'abc123', title: 'init', created_at: '2026-01-01T00:00:00Z' },
      protected: false,
    });

    await api.createBranch('proj', { name: 'feat/x', ref: 'main' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.branch).toBe('feat/x');
    expect(body.ref).toBe('main');
  });
});

describe('GitLabApi.deleteBranch', () => {
  it('sends DELETE to correct URL', async () => {
    const api = makeApi();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: { get: () => null },
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await api.deleteBranch('proj', 'old-branch');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/branches/old-branch');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('DELETE');
  });
});

describe('GitLabApi.compareBranches', () => {
  it('includes from, to and straight params', async () => {
    const api = makeApi();
    mockResponse({ commits: [], diffs: [], compare_timeout: false, compare_same_ref: false });

    await api.compareBranches('proj', 'main', 'develop', true);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('from=main');
    expect(url).toContain('to=develop');
    expect(url).toContain('straight=true');
  });
});

describe('GitLabApi.createTag', () => {
  it('sends tag_name, ref and optional message', async () => {
    const api = makeApi();
    mockResponse({ name: 'v1.0.0', message: 'Release', commit: makeCommit(), protected: false });

    await api.createTag('proj', 'v1.0.0', 'main', 'Release');

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.tag_name).toBe('v1.0.0');
    expect(body.ref).toBe('main');
    expect(body.message).toBe('Release');
  });
});

describe('GitLabApi.getRepositoryTree', () => {
  it('passes recursive and path options', async () => {
    const api = makeApi();
    mockResponse(
      [{ id: '1', name: 'src', type: 'tree', path: 'src', mode: '040000' }],
      { headers: { 'X-Total': '1' } }
    );

    await api.getRepositoryTree('proj', { path: 'src', recursive: true, ref: 'main' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('path=src');
    expect(url).toContain('recursive=true');
    expect(url).toContain('ref=main');
  });
});

// =============================================================================
// Wiki operations
// =============================================================================

describe('GitLabApi.createProjectWikiPage', () => {
  it('sends title, content and format in body', async () => {
    const api = makeApi();
    mockResponse({ slug: 'test-page', title: 'Test Page', format: 'markdown', content: '# Hi' });

    await api.createProjectWikiPage('proj', { title: 'Test Page', content: '# Hi', format: 'markdown' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.title).toBe('Test Page');
    expect(body.content).toBe('# Hi');
    expect(body.format).toBe('markdown');
  });
});

describe('GitLabApi.deleteProjectWikiPage', () => {
  it('sends DELETE to wiki slug URL', async () => {
    const api = makeApi();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: { get: () => null },
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await api.deleteProjectWikiPage('proj', 'my-page');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/wikis/my-page');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('DELETE');
  });
});

// =============================================================================
// Members & Discussions
// =============================================================================

describe('GitLabApi.listProjectMembers', () => {
  it('uses /members/all endpoint with query param', async () => {
    const api = makeApi();
    mockResponse(
      [{ id: 1, username: 'user1', name: 'User 1', state: 'active', web_url: 'https://gl/user1', access_level: 30, access_level_description: 'Developer', expires_at: null }],
      { headers: { 'X-Total': '1' } }
    );

    await api.listProjectMembers('proj', { query: 'user1' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/members/all');
    expect(url).toContain('query=user1');
  });
});

describe('GitLabApi.getMergeRequestDiscussions', () => {
  it('returns 404-specific error message', async () => {
    const api = makeApi();
    mockError(404, 'Not Found');

    await expect(api.getMergeRequestDiscussions('proj', 99))
      .rejects.toThrow('Merge request not found: Project ID proj, MR IID 99');
  });

  it('returns 403-specific error message', async () => {
    const api = makeApi();
    mockError(403, 'Forbidden');

    await expect(api.getMergeRequestDiscussions('proj', 1))
      .rejects.toThrow('Permission denied to access merge request discussions');
  });
});

// =============================================================================
// Auto-merge & Unapprove
// =============================================================================

describe('GitLabApi.setAutoMerge', () => {
  it('includes merge_when_pipeline_succeeds in body', async () => {
    const api = makeApi();
    mockResponse(makeMergeRequest(1));

    await api.setAutoMerge('proj', 1, { squash: true });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.merge_when_pipeline_succeeds).toBe(true);
    expect(body.squash).toBe(true);
  });
});

describe('GitLabApi.cancelAutoMerge', () => {
  it('returns 406-specific message when not set to auto-merge', async () => {
    const api = makeApi();
    mockError(406, 'Not Acceptable');

    await expect(api.cancelAutoMerge('proj', 1))
      .rejects.toThrow('Cannot cancel auto-merge: The merge request is not set to auto-merge');
  });
});

describe('GitLabApi.unapproveMergeRequest', () => {
  it('returns 404-specific message', async () => {
    const api = makeApi();
    mockError(404, 'Not Found');

    await expect(api.unapproveMergeRequest('proj', 1))
      .rejects.toThrow('Merge request not found: Project ID proj, MR IID 1');
  });
});

// =============================================================================
// Projects, Users, Groups
// =============================================================================

describe('GitLabApi.getProject', () => {
  it('appends statistics param when requested', async () => {
    const api = makeApi();
    mockResponse({
      id: 1, name: 'proj', description: null, path: 'proj', path_with_namespace: 'ns/proj',
      namespace: { id: 1, name: 'ns', path: 'ns', kind: 'group', full_path: 'ns' },
      default_branch: 'main', visibility: 'private', web_url: 'https://gl/proj',
      ssh_url_to_repo: 'git@gl:ns/proj.git', http_url_to_repo: 'https://gl/ns/proj.git',
      created_at: '2026-01-01T00:00:00Z', last_activity_at: '2026-01-01T00:00:00Z',
    });

    await api.getProject('proj', { statistics: true });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('statistics=true');
  });
});

describe('GitLabApi.getCurrentUser', () => {
  it('calls /user endpoint', async () => {
    const api = makeApi();
    mockResponse({
      id: 1, username: 'admin', name: 'Admin',
    });

    const result = await api.getCurrentUser();

    expect(result.username).toBe('admin');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toMatch(/\/user$/);
  });
});

describe('GitLabApi.listGroups', () => {
  it('passes search and owned options', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listGroups({ search: 'infra', owned: true });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('search=infra');
    expect(url).toContain('owned=true');
  });
});

describe('GitLabApi.forkProject', () => {
  function makeRepo() {
    return {
      id: 999, name: 'forked', description: null,
      web_url: 'https://gl/u/forked', default_branch: 'main', visibility: 'private' as const,
      ssh_url_to_repo: 'git@gl:u/forked.git', http_url_to_repo: 'https://gl/u/forked.git',
      created_at: '2026-01-01T00:00:00Z', last_activity_at: '2026-01-01T00:00:00Z',
    };
  }

  it('sends POST with namespace query param', async () => {
    const api = makeApi();
    mockResponse(makeRepo());

    await api.forkProject('org/original', 'my-namespace');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('namespace=my-namespace');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('POST');
  });

  it('omits namespace param when not provided', async () => {
    const api = makeApi();
    mockResponse(makeRepo());

    await api.forkProject('org/original');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain('namespace');
  });
});

describe('GitLabApi.getDefaultBranchRef', () => {
  it('returns default_branch from project', async () => {
    const api = makeApi();
    mockResponse({
      id: 1, name: 'proj', description: null,
      default_branch: 'develop', visibility: 'private',
      web_url: 'https://gl/proj',
      ssh_url_to_repo: 'git@gl:ns/proj.git', http_url_to_repo: 'https://gl/ns/proj.git',
      created_at: '2026-01-01T00:00:00Z', last_activity_at: '2026-01-01T00:00:00Z',
    });

    const result = await api.getDefaultBranchRef('proj');

    expect(result).toBe('develop');
  });
});

// =============================================================================
// Additional coverage: Wiki, Notes, Labels, Milestones, Groups
// =============================================================================

describe('GitLabApi.listProjectWikiPages', () => {
  it('appends with_content param when set', async () => {
    const api = makeApi();
    mockResponse([
      { slug: 'home', title: 'Home', format: 'markdown', content: '# Home', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ]);

    await api.listProjectWikiPages('proj', { with_content: true });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('with_content=true');
  });
});

describe('GitLabApi.getProjectWikiPage', () => {
  it('fetches wiki page with render_html and version params', async () => {
    const api = makeApi();
    mockResponse({ slug: 'setup', title: 'Setup', format: 'markdown', content: '# Setup' });

    await api.getProjectWikiPage('proj', 'setup', { render_html: true, version: 'abc123' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/wikis/setup');
    expect(url).toContain('render_html=true');
    expect(url).toContain('version=abc123');
  });
});

describe('GitLabApi.editProjectWikiPage', () => {
  it('sends PUT with title, content, and format', async () => {
    const api = makeApi();
    mockResponse({ slug: 'home', title: 'Home Updated', format: 'markdown', content: 'new' });

    await api.editProjectWikiPage('proj', 'home', { title: 'Home Updated', content: 'new', format: 'markdown' });

    expect((fetchMock.mock.calls[0][1] as any).method).toBe('PUT');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.title).toBe('Home Updated');
    expect(body.content).toBe('new');
  });
});

describe('GitLabApi.listGroupWikiPages', () => {
  it('uses /groups/ endpoint', async () => {
    const api = makeApi();
    mockResponse([]);

    await api.listGroupWikiPages('my-group');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/groups/my-group/wikis');
  });
});

describe('GitLabApi.createGroupWikiPage', () => {
  it('defaults format to markdown', async () => {
    const api = makeApi();
    mockResponse({ slug: 'test', title: 'Test', format: 'markdown', content: 'hi' });

    await api.createGroupWikiPage('grp', { title: 'Test', content: 'hi' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.format).toBe('markdown');
  });
});

describe('GitLabApi.deleteGroupWikiPage', () => {
  it('sends DELETE to group wiki slug', async () => {
    const api = makeApi();
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 204, statusText: 'No Content', headers: { get: () => null },
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await api.deleteGroupWikiPage('grp', 'old-page');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/groups/grp/wikis/old-page');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('DELETE');
  });
});

describe('GitLabApi.getIssueDiscussions', () => {
  it('returns 404-specific message for missing issue', async () => {
    const api = makeApi();
    mockError(404, 'Not Found');

    await expect(api.getIssueDiscussions('proj', 50))
      .rejects.toThrow('Issue not found: Project ID proj, Issue IID 50');
  });

  it('returns discussions on success', async () => {
    const api = makeApi();
    mockResponse(
      [{ id: 'd1', individual_note: true, notes: [makeNote(1)] }],
      { headers: { 'X-Total': '1' } }
    );

    const result = await api.getIssueDiscussions('proj', 5);
    expect(result.count).toBe(1);
    expect(result.items[0].id).toBe('d1');
  });
});

describe('GitLabApi.getMergeRequestNotes', () => {
  it('returns 404-specific message', async () => {
    const api = makeApi();
    mockError(404, 'Not Found');

    await expect(api.getMergeRequestNotes('proj', 99))
      .rejects.toThrow('Merge request not found: Project ID proj, MR IID 99');
  });

  it('passes sort and order_by params', async () => {
    const api = makeApi();
    mockResponse([makeNote(1)], { headers: { 'X-Total': '1' } });

    await api.getMergeRequestNotes('proj', 1, { sort: 'desc', order_by: 'updated_at' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('sort=desc');
    expect(url).toContain('order_by=updated_at');
  });
});

describe('GitLabApi.createMergeRequestNote', () => {
  it('sends body and internal flag', async () => {
    const api = makeApi();
    mockResponse(makeNote(10));

    await api.createMergeRequestNote('proj', 1, 'LGTM!', true);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.body).toBe('LGTM!');
    expect(body.internal).toBe(true);
  });
});

describe('GitLabApi.updateMergeRequestNote', () => {
  it('sends PUT to note endpoint', async () => {
    const api = makeApi();
    mockResponse(makeNote(10));

    await api.updateMergeRequestNote('proj', 1, 10, 'Updated comment');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/notes/10');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('PUT');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.body).toBe('Updated comment');
  });

  it('returns 404 for missing note', async () => {
    const api = makeApi();
    mockError(404, 'Not Found');

    await expect(api.updateMergeRequestNote('proj', 1, 999, 'x'))
      .rejects.toThrow('Note not found');
  });
});

describe('GitLabApi.createIssueNote', () => {
  it('sends POST with body and optional internal flag', async () => {
    const api = makeApi();
    mockResponse(makeNote(20));

    await api.createIssueNote('proj', 5, 'Investigating...', true);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.body).toBe('Investigating...');
    expect(body.internal).toBe(true);
  });
});

describe('GitLabApi.updateIssue', () => {
  it('joins labels and sends state_event', async () => {
    const api = makeApi();
    mockResponse(makeIssue(5));

    await api.updateIssue('proj', 5, { labels: ['done', 'wontfix'], state_event: 'close' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.labels).toBe('done,wontfix');
    expect(body.state_event).toBe('close');
  });
});

describe('GitLabApi.listLabels', () => {
  it('passes search param', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listLabels('proj', { search: 'bug' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('search=bug');
  });
});

describe('GitLabApi.createLabel', () => {
  it('sends name, color, description and priority', async () => {
    const api = makeApi();
    mockResponse({ id: 1, name: 'urgent', color: '#ff0000', description: 'Urgent issues' });

    await api.createLabel('proj', 'urgent', '#ff0000', 'Urgent issues', 1);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.name).toBe('urgent');
    expect(body.color).toBe('#ff0000');
    expect(body.description).toBe('Urgent issues');
    expect(body.priority).toBe(1);
  });
});

describe('GitLabApi.listMilestones', () => {
  it('handles iids array as query params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listMilestones('proj', { iids: [1, 2, 3], state: 'active' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('iids%5B%5D=1');
    expect(url).toContain('iids%5B%5D=2');
    expect(url).toContain('iids%5B%5D=3');
    expect(url).toContain('state=active');
  });
});

describe('GitLabApi.createMilestone', () => {
  it('sends title and date options', async () => {
    const api = makeApi();
    mockResponse({
      id: 1, iid: 1, title: 'v2.0', description: null, state: 'active',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      due_date: '2026-06-01', start_date: '2026-01-01', web_url: 'https://gl/milestones/1',
    });

    await api.createMilestone('proj', 'v2.0', { due_date: '2026-06-01', start_date: '2026-01-01' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.title).toBe('v2.0');
    expect(body.due_date).toBe('2026-06-01');
    expect(body.start_date).toBe('2026-01-01');
  });
});

describe('GitLabApi.listProtectedBranches', () => {
  it('passes search param', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listProtectedBranches('proj', { search: 'main' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/protected_branches');
    expect(url).toContain('search=main');
  });
});

describe('GitLabApi.protectBranch', () => {
  it('sends name and access level options', async () => {
    const api = makeApi();
    mockResponse({ id: 1, name: 'main', push_access_levels: [], merge_access_levels: [] });

    await api.protectBranch('proj', 'main', { push_access_level: 40, merge_access_level: 30, allow_force_push: false });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.name).toBe('main');
    expect(body.push_access_level).toBe(40);
    expect(body.merge_access_level).toBe(30);
    expect(body.allow_force_push).toBe(false);
  });
});

describe('GitLabApi.unprotectBranch', () => {
  it('sends DELETE to named branch endpoint', async () => {
    const api = makeApi();
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 204, statusText: 'No Content', headers: { get: () => null },
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await api.unprotectBranch('proj', 'release/*');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/protected_branches/release%2F*');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('DELETE');
  });
});

describe('GitLabApi.listUsers', () => {
  it('passes search and active filters', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listUsers({ search: 'john', active: true });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('search=john');
    expect(url).toContain('active=true');
  });
});

describe('GitLabApi.getUser', () => {
  it('fetches user by ID', async () => {
    const api = makeApi();
    mockResponse({ id: 42, username: 'johndoe', name: 'John' });

    const result = await api.getUser(42);

    expect(result.id).toBe(42);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/users/42');
  });
});

describe('GitLabApi.getGroup', () => {
  it('passes with_projects param', async () => {
    const api = makeApi();
    mockResponse({
      id: 1, name: 'Infra', path: 'infra', full_path: 'infra',
      description: null, visibility: 'private', web_url: 'https://gl/infra',
    });

    await api.getGroup('infra', { with_projects: true });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('with_projects=true');
  });
});

describe('GitLabApi.createGroup', () => {
  it('sends name, path and options in body', async () => {
    const api = makeApi();
    mockResponse({
      id: 10, name: 'New Team', path: 'new-team', full_path: 'new-team',
      description: 'A new team', visibility: 'private', web_url: 'https://gl/new-team',
    });

    await api.createGroup('New Team', 'new-team', { description: 'A new team', visibility: 'private' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.name).toBe('New Team');
    expect(body.path).toBe('new-team');
    expect(body.description).toBe('A new team');
  });
});

describe('GitLabApi.deleteGroup', () => {
  it('sends DELETE to group endpoint', async () => {
    const api = makeApi();
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 202, statusText: 'Accepted', headers: { get: () => null },
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await api.deleteGroup('old-group');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/groups/old-group');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('DELETE');
  });
});

describe('GitLabApi.listGroupSubgroups', () => {
  it('passes search and sort params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listGroupSubgroups('parent', { search: 'child', sort: 'asc' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/groups/parent/subgroups');
    expect(url).toContain('search=child');
    expect(url).toContain('sort=asc');
  });
});

describe('GitLabApi.listGroupMembers', () => {
  it('uses /groups/ members/all endpoint', async () => {
    const api = makeApi();
    mockResponse(
      [{ id: 1, username: 'u', name: 'U', state: 'active', web_url: 'https://gl/u', access_level: 50, expires_at: null }],
      { headers: { 'X-Total': '1' } }
    );

    await api.listGroupMembers('grp');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/groups/grp/members/all');
  });
});

describe('GitLabApi.getProjectEvents', () => {
  it('passes action and target_type filters', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.getProjectEvents('proj', { action: 'pushed', target_type: 'issue', sort: 'desc' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('action=pushed');
    expect(url).toContain('target_type=issue');
    expect(url).toContain('sort=desc');
  });
});

describe('GitLabApi.getMergeRequestChanges', () => {
  it('passes access_raw_diffs param', async () => {
    const api = makeApi();
    mockResponse({
      ...makeMergeRequest(1),
      changes: [{ old_path: 'a.ts', new_path: 'a.ts', new_file: false, renamed_file: false, deleted_file: false, diff: '@@ -1 +1 @@' }],
      overflow: false,
    });

    await api.getMergeRequestChanges('proj', 1, true);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/merge_requests/1/changes');
    expect(url).toContain('access_raw_diffs=true');
  });
});

describe('GitLabApi.updateMergeRequest', () => {
  it('joins labels and passes other options', async () => {
    const api = makeApi();
    mockResponse(makeMergeRequest(1));

    await api.updateMergeRequest('proj', 1, { labels: ['ready', 'reviewed'], draft: false });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.labels).toBe('ready,reviewed');
    expect(body.draft).toBe(false);
  });
});

describe('GitLabApi.rebaseMergeRequest', () => {
  it('sends skip_ci in body when provided', async () => {
    const api = makeApi();
    mockResponse({ rebase_in_progress: true });

    const result = await api.rebaseMergeRequest('proj', 1, true);

    expect(result.rebase_in_progress).toBe(true);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.skip_ci).toBe(true);
  });
});

describe('GitLabApi.listEnvironments', () => {
  it('passes states and search params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listEnvironments('proj', { states: 'available', search: 'prod' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('states=available');
    expect(url).toContain('search=prod');
  });
});

describe('GitLabApi.listBranches', () => {
  it('passes search and regex params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listBranches('proj', { search: 'feat', regex: '^feat/' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('search=feat');
    expect(url).toContain('regex=%5Efeat%2F');
  });
});

describe('GitLabApi.listTags', () => {
  it('passes search and order params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listTags('proj', { search: 'v1', order_by: 'name', sort: 'desc' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('search=v1');
    expect(url).toContain('order_by=name');
    expect(url).toContain('sort=desc');
  });
});

describe('GitLabApi.listReleases', () => {
  it('passes order and include_html_description params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.listReleases('proj', { order_by: 'released_at', include_html_description: true });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('order_by=released_at');
    expect(url).toContain('include_html_description=true');
  });
});

describe('GitLabApi.createRelease', () => {
  it('sends tag_name and release options', async () => {
    const api = makeApi();
    mockResponse({ tag_name: 'v2.0.0', name: 'Version 2', description: 'New release', created_at: '2026-01-01T00:00:00Z' });

    await api.createRelease('proj', 'v2.0.0', { name: 'Version 2', description: 'New release' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.tag_name).toBe('v2.0.0');
    expect(body.name).toBe('Version 2');
    expect(body.description).toBe('New release');
  });
});

describe('GitLabApi.retryPipeline', () => {
  it('POSTs to retry endpoint', async () => {
    const api = makeApi();
    mockResponse(makePipeline(42));

    await api.retryPipeline('proj', 42);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/pipelines/42/retry');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('POST');
  });
});

describe('GitLabApi.cancelJob', () => {
  it('POSTs to cancel job endpoint', async () => {
    const api = makeApi();
    mockResponse(makeJob(55));

    await api.cancelJob('proj', 55);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/jobs/55/cancel');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('POST');
  });
});

describe('GitLabApi.getJob', () => {
  it('fetches single job by ID', async () => {
    const api = makeApi();
    mockResponse(makeJob(88));

    const result = await api.getJob('proj', 88);

    expect(result.id).toBe(88);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/jobs/88');
  });
});

describe('GitLabApi.getEnvironment', () => {
  it('fetches single environment by ID', async () => {
    const api = makeApi();
    mockResponse({ id: 3, name: 'production', slug: 'production', state: 'available' });

    const result = await api.getEnvironment('proj', 3);

    expect(result.name).toBe('production');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/environments/3');
  });
});

describe('GitLabApi.updateProject', () => {
  it('sends PUT with project options', async () => {
    const api = makeApi();
    mockResponse({
      id: 1, name: 'proj', description: 'updated', visibility: 'internal',
      default_branch: 'main', web_url: 'https://gl/proj',
      ssh_url_to_repo: 'git@gl:ns/proj.git', http_url_to_repo: 'https://gl/ns/proj.git',
      created_at: '2026-01-01T00:00:00Z', last_activity_at: '2026-01-01T00:00:00Z',
    });

    await api.updateProject('proj', { description: 'updated', archived: true });

    expect((fetchMock.mock.calls[0][1] as any).method).toBe('PUT');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.description).toBe('updated');
    expect(body.archived).toBe(true);
  });
});

describe('GitLabApi.updateGroup', () => {
  it('sends PUT to group endpoint', async () => {
    const api = makeApi();
    mockResponse({
      id: 1, name: 'Renamed', path: 'renamed', full_path: 'renamed',
      description: null, visibility: 'private', web_url: 'https://gl/renamed',
    });

    await api.updateGroup('grp', { name: 'Renamed', visibility: 'private' });

    expect((fetchMock.mock.calls[0][1] as any).method).toBe('PUT');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.name).toBe('Renamed');
  });
});

describe('GitLabApi.updateLabel', () => {
  it('sends PUT with new_name and color', async () => {
    const api = makeApi();
    mockResponse({ id: 1, name: 'critical', color: '#ff0000' });

    await api.updateLabel('proj', 1, { new_name: 'critical', color: '#ff0000' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/labels/1');
    expect((fetchMock.mock.calls[0][1] as any).method).toBe('PUT');
  });
});

describe('GitLabApi.updateMilestone', () => {
  it('sends PUT with state_event', async () => {
    const api = makeApi();
    mockResponse({
      id: 1, iid: 1, title: 'v1.0', description: null, state: 'closed',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      due_date: null, start_date: null, web_url: 'https://gl/milestones/1',
    });

    await api.updateMilestone('proj', 1, { state_event: 'close' });

    expect((fetchMock.mock.calls[0][1] as any).method).toBe('PUT');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.state_event).toBe('close');
  });
});

describe('GitLabApi.getMergeRequestCommits', () => {
  it('passes pagination params', async () => {
    const api = makeApi();
    mockResponse([], { headers: { 'X-Total': '0' } });

    await api.getMergeRequestCommits('proj', 1, { page: 2, per_page: 5 });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/merge_requests/1/commits');
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=5');
  });
});

describe('GitLabApi.createRepository', () => {
  it('sends name, visibility and initialize_with_readme', async () => {
    const api = makeApi();
    mockResponse({
      id: 50, name: 'new-repo', description: 'Fresh repo', visibility: 'private',
      default_branch: 'main', web_url: 'https://gl/new-repo',
      ssh_url_to_repo: 'git@gl:ns/new-repo.git', http_url_to_repo: 'https://gl/ns/new-repo.git',
      created_at: '2026-01-01T00:00:00Z', last_activity_at: '2026-01-01T00:00:00Z',
    });

    await api.createRepository({ name: 'new-repo', description: 'Fresh repo', visibility: 'private', initialize_with_readme: true });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.name).toBe('new-repo');
    expect(body.initialize_with_readme).toBe(true);
  });
});
