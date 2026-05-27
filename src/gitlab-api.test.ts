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

// =============================================================================
// getJobLogSmart - section extraction
// =============================================================================

function mockJobLogResponse(rawLog: string) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    statusText: 'OK',
    headers: { get: () => null },
    text: async () => rawLog,
  } as unknown as Awaited<ReturnType<typeof fetch>>);
}

describe('GitLabApi.getJobLogSmart - section extraction', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  // GitLab CI section markers occupy their own line - format is:
  //   section_start:TIMESTAMP:NAME\r\x1B[0K\n
  //   ...payload lines...\n
  //   section_end:TIMESTAMP:NAME\r\x1B[0K\n
  // The lookahead pin (?=[\r\n\[]|$) blocks prefix matches like requesting
  // 'build' and silently extracting 'build_extra'.

  it('does NOT match a prefix - requesting "build" must skip "build_extra"', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'section_start:1700000000:build_extra\r\x1B[0K\n' +
      'build_extra payload\n' +
      'section_end:1700000001:build_extra\r\x1B[0K\n' +
      'unrelated trailing line\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, { section: 'build' });

    expect(result.section_matched).toBe(false);
    expect(result.log).toBe('');
  });

  it('matches an exact section followed by CR', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'section_start:1700000000:build\r\x1B[0K\n' +
      'build step output\n' +
      'section_end:1700000010:build\r\x1B[0K\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, { section: 'build' });

    expect(result.section_matched).toBe(true);
    expect(result.log).toContain('build step output');
  });

  it('matches an exact section whose marker carries a `[option]` collapsed marker', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'section_start:1700000000:script[collapsed=true]\r\x1B[0K\n' +
      'run the tests\n' +
      'section_end:1700000010:script\r\x1B[0K\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, { section: 'script' });

    expect(result.section_matched).toBe(true);
    expect(result.log).toContain('run the tests');
  });

  it('picks the exact section when a prefix-shared section appears alongside it', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'section_start:1700000000:build_extra\r\x1B[0K\n' +
      'build_extra payload\n' +
      'section_end:1700000001:build_extra\r\x1B[0K\n' +
      'section_start:1700000002:build\r\x1B[0K\n' +
      'the real build payload\n' +
      'section_end:1700000003:build\r\x1B[0K\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, { section: 'build' });

    expect(result.section_matched).toBe(true);
    expect(result.log).toContain('the real build payload');
    expect(result.log).not.toContain('build_extra payload');
  });
});

describe('GitLabApi.getJobLogSmart - section marker stripping (CRLF)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('strips both CR and LF after the section marker - no orphan blank lines mid-log', async () => {
    // Real GitLab: section_*:NNN:name\r\x1B[0K\n
    // After stripAnsi → section_*:NNN:name\r\n
    // The OLD regex `[\r\n]?` consumed only one of the two, leaving an orphan
    // blank line where each marker used to be. The fixed `\r?\n?` regex
    // consumes both, so the cleaned log has no spurious gaps.
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'section_start:1:build\r\x1B[0K\n' +
      'building...\n' +
      'last real output line\n' +
      'section_end:1:build\r\x1B[0K\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, {});

    // Cleaned log must contain only the two real payload lines, separated by
    // exactly one newline. With the bug, the result would include orphan
    // blank lines where the section markers used to be (manifesting as
    // sequences of `\n\n` in the output).
    expect(result.log).not.toMatch(/\n\n/);
    expect(result.log).toContain('building...');
    expect(result.log).toContain('last real output line');
  });

  it('tail: 2 must return the last TWO real lines, not orphan section blanks', async () => {
    // The orphan-`\n` bug caused tail: 2 to return a fragment like "\n" or
    // ""/"last_line" depending on log shape. With the marker fully stripped
    // the last 2 real lines are returned intact.
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'section_start:1:build\r\x1B[0K\n' +
      'building...\n' +
      'last real output line\n' +
      'section_end:1:build\r\x1B[0K\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, { tail: 2 });

    // Without the fix, tail: 2 would return "\n" (two orphan newlines).
    // With the fix, the cleaned log has structure
    //   "building...\nlast real output line\n"
    // so tail: 2 returns the slice after the second-to-last newline.
    expect(result.log).toContain('last real output line');
    expect(result.log).not.toBe('\n');
  });

  it('sections_found surfaces the bare section name, not the `[collapsed=true]` suffix', async () => {
    // GitLab `section_start:N:script[collapsed=true]\r\x1B[0K\n` discovery used
    // to surface `script[collapsed=true]` verbatim. A caller passing that string
    // back as the `section` arg would match the start marker (lookahead allows
    // `[` after the name) but `section_end:N:script` would not match the
    // start string with the brackets - the function would then read to EOF.
    // sections_found must therefore normalize to the bare canonical name.
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'section_start:1:script[collapsed=true]\r\x1B[0K\n' +
      'running tests\n' +
      'section_end:1:script\r\x1B[0K\n' +
      'section_start:2:build\r\x1B[0K\n' +
      'compiling\n' +
      'section_end:2:build\r\x1B[0K\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, {});

    expect(result.sections_found).toEqual(['script', 'build']);
    expect(result.sections_found).not.toContain('script[collapsed=true]');
  });

  it('strips raw `\\x1B[0K` clear-control between section name and LF even without prior ANSI strip (codex R5)', async () => {
    // When `strip_ansi: false`, stripSections runs on the raw log. GitLab's
    // section line is `section_*:NNN:name\r\x1B[0K\n` - the regex must
    // consume the `\x1B[0K` between `\r` and `\n` so no orphan
    // `\x1B[0K\n` fragments survive in the cleaned output.
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'section_start:1:s\r\x1B[0K\n' +
      'payload line\n' +
      'section_end:1:s\r\x1B[0K\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, { strip_ansi: false });

    // Section markers + their clear-control bytes are gone entirely
    expect(result.log).not.toContain('section_start');
    expect(result.log).not.toContain('section_end');
    expect(result.log).not.toContain('\x1B[0K');
    // Real payload preserved
    expect(result.log).toContain('payload line');
  });

  it('tail: 1 on a single-line log with trailing newline returns the line content (codex R5)', async () => {
    // The original logTail walked all `\n` from the end including the
    // trailing terminator, so `tail: 1` on `"ERROR\n"` returned `""` (the
    // slice after position 5 / end-of-string). The fix treats a single
    // trailing `\n` as the terminator + an outer unconditional strip
    // ensures the `log` field has a stable shape across the truncation
    // boundary - the same tool no longer sometimes returns `"ERROR\n"`
    // and sometimes `"ERROR"` for the same content.
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    mockJobLogResponse('ERROR\n');

    const result = await api.getJobLogSmart('proj', 42, { tail: 1 });

    expect(result.log).toBe('ERROR');
    expect(result.line_count).toBe(1);
    // Critically: log is NOT the empty string (the codex R5 regression)
    expect(result.log).not.toBe('');
  });

  it('tail: 50 on a 50-line log returns ALL 50 lines, not 49 (codex R5)', async () => {
    // The pre-fix bug shaved the last line off every log because the
    // trailing `\n` was counted as a 51st empty slot.
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const lines = Array.from({ length: 50 }, (_, i) => `line-${i + 1}`);
    const log = lines.join('\n') + '\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, { tail: 50 });

    expect(result.log).toContain('line-50');
    expect(result.log).toContain('line-1');
    expect(result.line_count).toBe(50);
  });

  it('strips section markers even when strip_ansi: false (markers are noise regardless of ANSI flag)', async () => {
    // Section stripping is decoupled from the strip_ansi flag - they're
    // independent concerns. A caller debugging raw ANSI output should still
    // get a clean tail/head window without `section_start:NNN:name\r\x1B[0K`
    // pollution.
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'section_start:1:script\r\x1B[0K\n' +
      '\x1B[31mERROR\x1B[0m: something broke\n' +
      'section_end:1:script\r\x1B[0K\n';
    mockJobLogResponse(log);

    const result = await api.getJobLogSmart('proj', 42, { strip_ansi: false });

    // Section markers are gone
    expect(result.log).not.toContain('section_start');
    expect(result.log).not.toContain('section_end');
    // ANSI escapes are preserved (strip_ansi: false)
    expect(result.log).toContain('\x1B[31m');
    // The real payload survives
    expect(result.log).toContain('ERROR');
  });

  it('strips the entire section line even when no payload precedes section_end', async () => {
    const api = new GitLabApi({ apiUrl: 'https://gitlab.example/api/v4', token: 't' });
    const log =
      'first real line\n' +
      'section_start:1:s\r\x1B[0K\n' +
      'section_end:1:s\r\x1B[0K\n' +
      'second real line\n';
    mockJobLogResponse(log);

    // strip_ansi defaults to true. After cleaning we should see two real
    // lines with no orphan blanks where the markers used to be.
    const result = await api.getJobLogSmart('proj', 42, {});

    expect(result.log).toContain('first real line');
    expect(result.log).toContain('second real line');
    // No double newlines from orphan \n bytes
    expect(result.log).not.toMatch(/\n\n/);
  });
});
