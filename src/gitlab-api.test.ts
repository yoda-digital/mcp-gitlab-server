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

describe('GitLabApi.uploadProjectWikiAttachment (#62)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  function mockWikiAttachmentResponse(payload: unknown) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      statusText: 'OK',
      headers: { get: () => null },
      json: async () => payload,
    } as unknown as Awaited<ReturnType<typeof fetch>>);
  }

  it('sends a multipart/form-data body with the file blob, no Content-Type override', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    mockWikiAttachmentResponse({
      file_name: 'note.md',
      file_path: 'uploads/note.md',
      branch: 'main',
      link: { url: '/uploads/abc/note.md', markdown: '[note.md](/uploads/abc/note.md)' },
    });

    await api.uploadProjectWikiAttachment('my-proj', {
      file_path: 'docs/note.md',
      content: 'hello world',
      branch: 'main',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = (init as RequestInit).body;
    expect(body).toBeInstanceOf(FormData);
    // Headers should not include Content-Type — runtime sets the multipart boundary.
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers['content-type']).toBeUndefined();

    const fd = body as FormData;
    const file = fd.get('file');
    expect(file).toBeInstanceOf(Blob);
    expect((file as Blob).type).toBe('application/octet-stream');
    expect(fd.get('branch')).toBe('main');
  });

  it('omits branch from form when not provided', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    mockWikiAttachmentResponse({
      file_name: 'note.md', file_path: 'uploads/note.md', branch: 'main',
      link: { url: '/uploads/abc/note.md', markdown: '![note.md](/uploads/abc/note.md)' },
    });

    await api.uploadProjectWikiAttachment('my-proj', {
      file_path: 'docs/note.md',
      content: 'hello',
    });

    const fd = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(fd.has('branch')).toBe(false);
  });

  it('base64-decodes content when content_encoding is base64', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    mockWikiAttachmentResponse({
      file_name: 'image.png', file_path: 'uploads/image.png', branch: 'main',
      link: { url: '/uploads/img.png', markdown: '![image.png](/uploads/img.png)' },
    });

    // 4-byte PNG file signature: 89 50 4E 47
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const base64 = pngSignature.toString('base64'); // 'iVBORw=='

    await api.uploadProjectWikiAttachment('my-proj', {
      file_path: 'image.png',
      content: base64,
      content_encoding: 'base64',
    });

    const fd = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    const blob = fd.get('file') as Blob;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x4e);
    expect(bytes[3]).toBe(0x47);
  });

  it('treats content as raw text when content_encoding is omitted (default utf8)', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    mockWikiAttachmentResponse({
      file_name: 'a.txt', file_path: 'a.txt', branch: 'main',
      link: { url: '/uploads/a.txt', markdown: '[a.txt](/uploads/a.txt)' },
    });

    const text = 'iVBORw=='; // looks like base64 but caller didn't opt in
    await api.uploadProjectWikiAttachment('my-proj', {
      file_path: 'a.txt',
      content: text,
    });

    const fd = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    const blob = fd.get('file') as Blob;
    expect(await blob.text()).toBe('iVBORw==');
  });

  it('parses the modern GitLab response shape (link.url, link.markdown)', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    mockWikiAttachmentResponse({
      file_name: 'doc.md',
      file_path: 'uploads/doc.md',
      branch: 'main',
      link: { url: '/uploads/xyz/doc.md', markdown: '[doc.md](/uploads/xyz/doc.md)' },
    });

    const result = await api.uploadProjectWikiAttachment('my-proj', {
      file_path: 'doc.md', content: 'x',
    });

    expect(result.link?.url).toBe('/uploads/xyz/doc.md');
    expect(result.link?.markdown).toBe('[doc.md](/uploads/xyz/doc.md)');
  });

  it('parses the legacy GitLab response shape (flat url, commit_id)', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    // Older self-hosted GitLab returned the flat shape.
    mockWikiAttachmentResponse({
      file_name: 'old.md',
      file_path: 'uploads/old.md',
      branch: 'main',
      url: '/uploads/legacy/old.md',
      commit_id: 'abc123',
    });

    const result = await api.uploadProjectWikiAttachment('my-proj', {
      file_path: 'old.md', content: 'x',
    });

    expect(result.link).toBeUndefined();
    expect(result.url).toBe('/uploads/legacy/old.md');
    expect(result.commit_id).toBe('abc123');
  });
});
