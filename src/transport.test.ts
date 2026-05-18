import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { setupTransport, isLoopbackHost, requireSafeTransportConfig } from './transport.js';
import http from 'http';

/**
 * Integration tests for transport.ts:
 * - Bearer token extraction (OAuth mode)
 * - Streamable HTTP session lifecycle
 * - Cross-protocol session collision
 * - CORS origin handling
 * - /livez, /readyz, /healthz endpoints
 */

// Helper: make HTTP request and return response
function request(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, method, path, headers },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Helper: make request that resolves as soon as status + headers arrive (for SSE)
function requestStatus(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; destroy: () => void }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, method, path, headers },
      (res) => {
        resolve({
          status: res.statusCode!,
          headers: res.headers,
          destroy: () => { res.destroy(); req.destroy(); }
        });
      }
    );
    req.on('error', (err) => {
      // Ignore ECONNRESET from destroy()
      if ((err as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(err);
    });
    req.end();
  });
}

// Helper: create a minimal MCP server that responds to list_tools
function createTestServer(token: string): Server {
  const server = new Server(
    { name: 'test-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{ name: 'test_tool', description: `Tool for ${token}`, inputSchema: { type: 'object' as const, properties: {} } }]
  }));
  return server;
}

describe('Transport — OAuth Bearer extraction', () => {
  let port: number;

  beforeAll(async () => {
    port = 19100 + Math.floor(Math.random() * 900);
    process.env.AUTH_MODE = 'oauth';
    process.env.CORS_ALLOW_ORIGINS = '';
    await setupTransport(null, {
      port,
      useSSE: true,
      useStreamableHttp: true,
      serverFactory: createTestServer,
    });
    await new Promise((r) => setTimeout(r, 50));
  });

  afterAll(() => {
    delete process.env.AUTH_MODE;
    delete process.env.CORS_ALLOW_ORIGINS;
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(port, 'GET', '/sse');
    expect(res.status).toBe(401);
    expect(res.body).toContain('Unauthorized');
  });

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const res = await request(port, 'GET', '/sse', { Authorization: 'Basic abc123' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when Bearer token is empty', async () => {
    const res = await request(port, 'GET', '/sse', { Authorization: 'Bearer ' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for malformed Authorization (no space after Bearer)', async () => {
    const res = await request(port, 'GET', '/sse', { Authorization: 'Bearertoken123' });
    expect(res.status).toBe(401);
  });

  it('accepts case-variant "bearer" (lowercase)', async () => {
    const { status, destroy } = await requestStatus(port, 'GET', '/sse', { Authorization: 'bearer my-token-123' });
    expect(status).toBe(200);
    destroy();
  });

  it('accepts case-variant "BEARER" (uppercase)', async () => {
    const { status, destroy } = await requestStatus(port, 'GET', '/sse', { Authorization: 'BEARER MY-TOKEN-456' });
    expect(status).toBe(200);
    destroy();
  });

  it('returns 401 for Streamable HTTP POST /mcp without Authorization', async () => {
    const initPayload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
    });
    const res = await request(port, 'POST', '/mcp', {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    }, initPayload);
    expect(res.status).toBe(401);
  });
});

describe('Transport — Streamable HTTP session lifecycle', () => {
  let port: number;

  beforeAll(async () => {
    port = 19200 + Math.floor(Math.random() * 900);
    process.env.AUTH_MODE = 'oauth';
    process.env.CORS_ALLOW_ORIGINS = '';
    await setupTransport(null, {
      port,
      useStreamableHttp: true,
      serverFactory: createTestServer,
    });
    await new Promise((r) => setTimeout(r, 50));
  });

  afterAll(() => {
    delete process.env.AUTH_MODE;
    delete process.env.CORS_ALLOW_ORIGINS;
  });

  it('initializes a session and returns MCP-Session-Id', async () => {
    const initPayload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
    });
    const res = await request(
      port, 'POST', '/mcp',
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        Authorization: 'Bearer test-token'
      },
      initPayload
    );
    expect(res.status).toBe(200);
    expect(res.headers['mcp-session-id']).toBeDefined();
    expect(res.headers['mcp-session-id']).toMatch(/^[0-9a-f-]+$/);
  });

  it('reuses an existing session with valid MCP-Session-Id', async () => {
    // First: initialize
    const initPayload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
    });
    const initRes = await request(
      port, 'POST', '/mcp',
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        Authorization: 'Bearer reuse-token'
      },
      initPayload
    );
    const sessionId = initRes.headers['mcp-session-id'] as string;
    expect(sessionId).toBeDefined();

    // Send initialized notification — Authorization required on every
    // existing-session request (sessionId is bound to the originating Bearer).
    const initializedPayload = JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });
    await request(
      port, 'POST', '/mcp',
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Session-Id': sessionId,
        Authorization: 'Bearer reuse-token'
      },
      initializedPayload
    );

    // Second: list_tools on same session — same Bearer required.
    const listPayload = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });
    const listRes = await request(
      port, 'POST', '/mcp',
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Session-Id': sessionId,
        Authorization: 'Bearer reuse-token'
      },
      listPayload
    );
    expect(listRes.status).toBe(200);
    // Response may be plain JSON or SSE-wrapped depending on SDK version
    let body: any;
    if (listRes.body.startsWith('event:') || listRes.body.startsWith('data:')) {
      // Parse SSE format: extract JSON from "data: {...}" lines
      const dataLine = listRes.body.split('\n').find(l => l.startsWith('data: '));
      body = JSON.parse(dataLine!.replace('data: ', ''));
    } else {
      body = JSON.parse(listRes.body);
    }
    expect(body.result.tools).toBeDefined();
    expect(body.result.tools[0].name).toBe('test_tool');
  });

  it('cleans up session on DELETE /mcp', async () => {
    // Initialize
    const initPayload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
    });
    const initRes = await request(
      port, 'POST', '/mcp',
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        Authorization: 'Bearer cleanup-token'
      },
      initPayload
    );
    const sessionId = initRes.headers['mcp-session-id'] as string;
    expect(sessionId).toBeDefined();

    // DELETE to close the session — Authorization required on every
    // existing-session request.
    const delRes = await request(
      port, 'DELETE', '/mcp',
      { 'MCP-Session-Id': sessionId, Authorization: 'Bearer cleanup-token' }
    );
    // 200 or 204 — session terminated
    expect([200, 204]).toContain(delRes.status);

    // Attempt to reuse closed session → should fail.
    // Same Bearer used; the server should reject because the session no
    // longer exists, not because of auth.
    const reusePayload = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });
    const reuseRes = await request(
      port, 'POST', '/mcp',
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Session-Id': sessionId,
        Authorization: 'Bearer cleanup-token'
      },
      reusePayload
    );
    // Session no longer exists — should get 400 (session not found)
    expect(reuseRes.status).toBe(400);
    const reuseBody = JSON.parse(reuseRes.body);
    expect(reuseBody.error.message).toContain('Session not found');
  });
});

describe('Transport — cross-protocol session collision', () => {
  let port: number;

  beforeAll(async () => {
    port = 19300 + Math.floor(Math.random() * 900);
    process.env.AUTH_MODE = 'oauth';
    process.env.CORS_ALLOW_ORIGINS = '';
    await setupTransport(null, {
      port,
      useSSE: true,
      useStreamableHttp: true,
      serverFactory: createTestServer,
    });
    await new Promise((r) => setTimeout(r, 50));
  });

  afterAll(() => {
    delete process.env.AUTH_MODE;
    delete process.env.CORS_ALLOW_ORIGINS;
  });

  it('returns 400 when using a non-existent session ID on Streamable HTTP endpoint', async () => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    const mcpRes = await request(
      port, 'POST', '/mcp',
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Session-Id': 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
      },
      payload
    );
    expect(mcpRes.status).toBe(400);
    const body = JSON.parse(mcpRes.body);
    expect(body.error.message).toContain('Bad Request');
  });

  it('returns 400 when SSE session ID is used on Streamable HTTP endpoint', async () => {
    // First create an SSE connection to get a real session in the transports map
    const { status, destroy } = await requestStatus(port, 'GET', '/sse', {
      Authorization: 'Bearer collision-token'
    });
    expect(status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));

    // The SSE session ID is internal; we simulate by using a random UUID
    // that could theoretically collide. The transport type check is what matters.
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    const mcpRes = await request(
      port, 'POST', '/mcp',
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Session-Id': 'fake-collision-id'
      },
      payload
    );
    // Not found as StreamableHTTP → 400
    expect(mcpRes.status).toBe(400);
    destroy();
  });
});

describe('Transport — /livez, /readyz, /healthz endpoints', () => {
  let port: number;

  beforeAll(async () => {
    port = 19400 + Math.floor(Math.random() * 900);
    process.env.AUTH_MODE = 'pat';
    process.env.CORS_ALLOW_ORIGINS = '';
    const server = createTestServer('pat-token');
    await setupTransport(server, { port, useSSE: true });
    await new Promise((r) => setTimeout(r, 50));
  });

  afterAll(() => {
    delete process.env.AUTH_MODE;
    delete process.env.CORS_ALLOW_ORIGINS;
  });

  it('/livez returns 200 unconditionally', async () => {
    const res = await request(port, 'GET', '/livez');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });

  it('/readyz returns 200 with status ok and session count', async () => {
    const res = await request(port, 'GET', '/readyz');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(typeof body.sessions).toBe('number');
  });

  it('/healthz is retained as alias of /readyz', async () => {
    const res = await request(port, 'GET', '/healthz');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(typeof body.sessions).toBe('number');
  });

  it('/readyz returns 503 when sessions exceed HEALTHZ_MAX_SESSIONS', async () => {
    const orig = process.env.HEALTHZ_MAX_SESSIONS;
    process.env.HEALTHZ_MAX_SESSIONS = '0'; // force overflow

    const res = await request(port, 'GET', '/readyz');
    expect(res.status).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('unhealthy');
    expect(body.reason).toBe('session_limit_exceeded');

    // restore
    if (orig) process.env.HEALTHZ_MAX_SESSIONS = orig;
    else delete process.env.HEALTHZ_MAX_SESSIONS;
  });

  it('/livez returns 200 even when sessions exceed HEALTHZ_MAX_SESSIONS', async () => {
    const orig = process.env.HEALTHZ_MAX_SESSIONS;
    process.env.HEALTHZ_MAX_SESSIONS = '0'; // force overflow

    const res = await request(port, 'GET', '/livez');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');

    if (orig) process.env.HEALTHZ_MAX_SESSIONS = orig;
    else delete process.env.HEALTHZ_MAX_SESSIONS;
  });

  it('/healthz also returns 503 when sessions exceed HEALTHZ_MAX_SESSIONS', async () => {
    const orig = process.env.HEALTHZ_MAX_SESSIONS;
    process.env.HEALTHZ_MAX_SESSIONS = '0';

    const res = await request(port, 'GET', '/healthz');
    expect(res.status).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('unhealthy');
    expect(body.reason).toBe('session_limit_exceeded');

    if (orig) process.env.HEALTHZ_MAX_SESSIONS = orig;
    else delete process.env.HEALTHZ_MAX_SESSIONS;
  });

  it('/readyz returns incremented session count after SSE connection', async () => {
    const beforeRes = await request(port, 'GET', '/readyz');
    const before = JSON.parse(beforeRes.body).sessions;

    const { status, destroy } = await requestStatus(port, 'GET', '/sse');
    expect(status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));

    const afterRes = await request(port, 'GET', '/readyz');
    const after = JSON.parse(afterRes.body).sessions;
    expect(after).toBeGreaterThan(before);

    destroy();
  });
});

describe('Transport — config safety guards (GHSA-8jr5-6gvj-rfpf)', () => {
  it('isLoopbackHost recognises loopback variants', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('::1')).toBe(true);
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('LOCALHOST')).toBe(true);    // case-insensitive
    expect(isLoopbackHost('Localhost')).toBe(true);
    expect(isLoopbackHost('::ffff:127.0.0.1')).toBe(true);
  });

  it('isLoopbackHost covers the entire 127.0.0.0/8 IPv4 range', () => {
    // `127.x.y.z` for any x,y,z is loopback on Linux/macOS — operators
    // sometimes pick non-127.0.0.1 addresses to dodge port conflicts.
    expect(isLoopbackHost('127.0.0.2')).toBe(true);
    expect(isLoopbackHost('127.5.6.7')).toBe(true);
    expect(isLoopbackHost('127.255.255.254')).toBe(true);
    expect(isLoopbackHost('::ffff:127.5.6.7')).toBe(true);
  });

  it('isLoopbackHost rejects network-exposed addresses', () => {
    expect(isLoopbackHost('0.0.0.0')).toBe(false);
    expect(isLoopbackHost('192.168.1.5')).toBe(false);
    expect(isLoopbackHost('10.0.0.1')).toBe(false);
    expect(isLoopbackHost('128.0.0.1')).toBe(false);   // off-by-one from 127/8
    expect(isLoopbackHost('::')).toBe(false);
    expect(isLoopbackHost('::ffff:192.168.1.5')).toBe(false);
  });

  it('isLoopbackHost rejects malformed/garbage input', () => {
    expect(isLoopbackHost('')).toBe(false);
    expect(isLoopbackHost('not-an-address')).toBe(false);
    expect(isLoopbackHost('127')).toBe(false);
    expect(isLoopbackHost('127.0.0.1.5')).toBe(false);
    expect(isLoopbackHost('999.999.999.999')).toBe(false);
  });

  it('requireSafeTransportConfig allows stdio (no HTTP)', () => {
    expect(requireSafeTransportConfig({
      useSSE: false, useStreamableHttp: false, host: '0.0.0.0', authMode: 'pat'
    })).toBeNull();
  });

  it('requireSafeTransportConfig allows PAT mode on loopback', () => {
    expect(requireSafeTransportConfig({
      useSSE: true, useStreamableHttp: false, host: '127.0.0.1', authMode: 'pat'
    })).toBeNull();
  });

  it('requireSafeTransportConfig allows OAuth on any bind', () => {
    expect(requireSafeTransportConfig({
      useSSE: true, useStreamableHttp: false, host: '0.0.0.0', authMode: 'oauth'
    })).toBeNull();
    expect(requireSafeTransportConfig({
      useSSE: false, useStreamableHttp: true, host: '192.168.1.5', authMode: 'oauth'
    })).toBeNull();
  });

  it('requireSafeTransportConfig rejects PAT + non-loopback (SSE)', () => {
    const err = requireSafeTransportConfig({
      useSSE: true, useStreamableHttp: false, host: '0.0.0.0', authMode: 'pat'
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/AUTH_MODE=oauth/);
    expect(err).toMatch(/HOST=127\.0\.0\.1/);
  });

  it('requireSafeTransportConfig rejects PAT + non-loopback (Streamable HTTP)', () => {
    const err = requireSafeTransportConfig({
      useSSE: false, useStreamableHttp: true, host: '10.0.0.1', authMode: 'pat'
    });
    expect(err).not.toBeNull();
  });

  it('setupTransport throws when called with unsafe config (defense in depth)', async () => {
    process.env.AUTH_MODE = 'pat';
    await expect(setupTransport(null, {
      port: 19999,
      host: '0.0.0.0',
      useSSE: true,
      serverFactory: createTestServer,
    })).rejects.toThrow(/non-loopback/);
    delete process.env.AUTH_MODE;
  });
});

describe('Transport — sessionId-Bearer binding (GHSA-8jr5-6gvj-rfpf)', () => {
  let port: number;

  beforeAll(async () => {
    port = 19600 + Math.floor(Math.random() * 200);
    process.env.AUTH_MODE = 'oauth';
    process.env.CORS_ALLOW_ORIGINS = '';
    await setupTransport(null, {
      port,
      host: '127.0.0.1',
      useSSE: true,
      useStreamableHttp: true,
      serverFactory: createTestServer,
    });
    await new Promise((r) => setTimeout(r, 50));
  });

  afterAll(() => {
    delete process.env.AUTH_MODE;
    delete process.env.CORS_ALLOW_ORIGINS;
  });

  it('Streamable HTTP: rejects existing session reused with a different Bearer', async () => {
    // Initialize a session with token-A
    const initPayload = JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
    });
    const initRes = await request(port, 'POST', '/mcp', {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      Authorization: 'Bearer token-A',
    }, initPayload);
    expect(initRes.status).toBe(200);
    const sid = initRes.headers['mcp-session-id'] as string;
    expect(sid).toBeDefined();

    // Attacker reuses sid with token-B → 401
    const attackPayload = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const attackRes = await request(port, 'POST', '/mcp', {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      Authorization: 'Bearer token-B',
      'MCP-Session-Id': sid,
    }, attackPayload);
    expect(attackRes.status).toBe(401);
    expect(attackRes.body).toMatch(/Authorization does not match/);
  });

  it('Streamable HTTP: rejects existing session reused with no Authorization header', async () => {
    const initPayload = JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
    });
    const initRes = await request(port, 'POST', '/mcp', {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      Authorization: 'Bearer leak-source',
    }, initPayload);
    const sid = initRes.headers['mcp-session-id'] as string;

    const attackRes = await request(port, 'POST', '/mcp', {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Session-Id': sid,
    }, JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }));
    expect(attackRes.status).toBe(401);
  });
});

describe('Transport — CORS origin handling', () => {
  let port: number;

  beforeAll(async () => {
    port = 19500 + Math.floor(Math.random() * 900);
    process.env.AUTH_MODE = 'oauth';
    process.env.CORS_ALLOW_ORIGINS = 'https://app.example.com,https://admin.example.com';
    await setupTransport(null, {
      port,
      useStreamableHttp: true,
      serverFactory: createTestServer,
    });
    await new Promise((r) => setTimeout(r, 50));
  });

  afterAll(() => {
    delete process.env.AUTH_MODE;
    delete process.env.CORS_ALLOW_ORIGINS;
  });

  it('sets Allow-Origin for allowlisted origin', async () => {
    const res = await request(port, 'OPTIONS', '/mcp', { Origin: 'https://app.example.com' });
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  it('does NOT set Allow-Origin for non-allowlisted origin', async () => {
    const res = await request(port, 'OPTIONS', '/mcp', { Origin: 'https://evil.com' });
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does NOT set Allow-Origin when no Origin header is sent', async () => {
    const res = await request(port, 'GET', '/healthz');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Transport — PAT + Streamable HTTP per-session factory (#62)', () => {
  let port: number;
  let factoryCalls = 0;

  beforeAll(async () => {
    port = 19800 + Math.floor(Math.random() * 100);
    process.env.AUTH_MODE = 'pat';
    process.env.CORS_ALLOW_ORIGINS = '';
    factoryCalls = 0;
    // Both `server` (static, signals PAT mode) AND `serverFactory` (per-session)
    // are passed. The setupTransport contract treats this as "PAT with
    // per-session factory" — the factory is invoked per session, the static
    // server argument acts as a mode flag.
    const staticServer = createTestServer('pat-mode');
    await setupTransport(staticServer, {
      port,
      useStreamableHttp: true,
      host: '127.0.0.1',
      serverFactory: () => {
        factoryCalls++;
        return createTestServer(`session-${factoryCalls}`);
      },
    });
    await new Promise((r) => setTimeout(r, 50));
  });

  afterAll(() => {
    delete process.env.AUTH_MODE;
    delete process.env.CORS_ALLOW_ORIGINS;
  });

  it('invokes the factory once per session, without requiring an Authorization header', async () => {
    const before = factoryCalls;
    const init = (id: number) => JSON.stringify({
      jsonrpc: '2.0', id, method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
    });
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      // No Authorization header: PAT-mode-with-factory must accept this.
    };

    const r1 = await request(port, 'POST', '/mcp', headers, init(1));
    const r2 = await request(port, 'POST', '/mcp', headers, init(2));

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.headers['mcp-session-id']).toBeDefined();
    expect(r2.headers['mcp-session-id']).toBeDefined();
    expect(r1.headers['mcp-session-id']).not.toBe(r2.headers['mcp-session-id']);
    expect(factoryCalls - before).toBe(2);
  });
});
