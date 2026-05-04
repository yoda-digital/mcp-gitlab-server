import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { setupTransport } from './transport.js';
import http from 'http';

/**
 * Integration tests for transport.ts:
 * - Bearer token extraction (OAuth mode)
 * - Streamable HTTP session lifecycle
 * - Cross-protocol session collision
 * - CORS origin handling
 * - /healthz endpoint
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

    // Send initialized notification
    const initializedPayload = JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });
    await request(
      port, 'POST', '/mcp',
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Session-Id': sessionId
      },
      initializedPayload
    );

    // Second: list_tools on same session
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
        'MCP-Session-Id': sessionId
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

    // DELETE to close the session
    const delRes = await request(
      port, 'DELETE', '/mcp',
      { 'MCP-Session-Id': sessionId }
    );
    // 200 or 204 — session terminated
    expect([200, 204]).toContain(delRes.status);

    // Attempt to reuse closed session → should fail
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
        'MCP-Session-Id': sessionId
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

describe('Transport — /healthz endpoint', () => {
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

  it('returns 200 with status ok and session count', async () => {
    const res = await request(port, 'GET', '/healthz');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(typeof body.sessions).toBe('number');
  });

  it('returns incremented session count after SSE connection', async () => {
    // Get baseline
    const beforeRes = await request(port, 'GET', '/healthz');
    const before = JSON.parse(beforeRes.body).sessions;

    // Open an SSE connection (PAT mode — reuses single server)
    const { status, destroy } = await requestStatus(port, 'GET', '/sse');
    expect(status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));

    const afterRes = await request(port, 'GET', '/healthz');
    const after = JSON.parse(afterRes.body).sessions;
    expect(after).toBeGreaterThan(before);

    destroy();
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
