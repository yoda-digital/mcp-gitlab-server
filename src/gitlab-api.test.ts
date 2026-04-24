import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-fetch', () => ({ default: vi.fn() }));

import fetch from 'node-fetch';
import { GitLabApi } from './gitlab-api.js';

const fetchMock = vi.mocked(fetch);

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

function mockIssuesResponse(issues: unknown[], total = issues.length) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    statusText: 'OK',
    headers: { get: (h: string) => (h === 'X-Total' ? String(total) : null) },
    json: async () => issues,
  } as unknown as Awaited<ReturnType<typeof fetch>>);
}

describe('GitLabApi.listIssues', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('filters by iid server-side via iids[] query param', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    mockIssuesResponse([makeIssue(42)], 1);

    await api.listIssues('my-proj', { iid: 42 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('iids%5B%5D=42');
  });

  it('omits the iids[] query param when iid is not provided', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    mockIssuesResponse([makeIssue(1), makeIssue(2)], 2);

    await api.listIssues('my-proj');

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).not.toContain('iids');
  });

  it('returns items as delivered by the server without client-side iid filtering', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    // Server has already filtered to iid=99. Prove we don't re-filter client-side
    // by returning an issue whose iid differs from what was requested — the old
    // client-side filter would drop it; we should surface it as-is.
    mockIssuesResponse([makeIssue(7)], 1);

    const result = await api.listIssues('my-proj', { iid: 99 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].iid).toBe(7);
    expect(result.count).toBe(1);
  });
});
