import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { isIPv4, isIPv6 } from "net";
import { parse } from "url";

/**
 * Loopback detection — used to gate the unauthenticated PAT-mode default.
 * A non-loopback bind in PAT mode is treated as fatal misconfiguration
 * because the transport carries no auth check on /sse or /messages.
 *
 * Covers the full IPv4 loopback range (127.0.0.0/8 — `127.1.2.3` is just
 * as loopback as `127.0.0.1` on Linux/macOS), the IPv6 loopback `::1`,
 * IPv4-mapped IPv6 loopback (`::ffff:127.x.y.z`), and the case-insensitive
 * hostname `localhost`. A naive equality check on `127.0.0.1` alone would
 * have missed an operator binding to `127.5.6.7` for port-conflict reasons.
 *
 * Note on `localhost`: this is a NAME match, not a DNS/hosts-file
 * resolution. An operator with `/etc/hosts` mapping `localhost` to a
 * non-loopback address would pass this check by name while Node's
 * `httpServer.listen("localhost", …)` resolves to the public IP. That
 * scenario is operator-induced and not defended against here — for
 * hardening configs, prefer IP literals (`127.0.0.1`) over names.
 */
export function isLoopbackHost(host: string): boolean {
  if (host.toLowerCase() === 'localhost') return true;
  if (isIPv4(host)) {
    return host.startsWith('127.');
  }
  if (isIPv6(host)) {
    if (host === '::1') return true;
    // Mixed-notation IPv4-mapped IPv6: ::ffff:127.x.y.z
    const v4Mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(host);
    if (v4Mapped && isIPv4(v4Mapped[1])) {
      return v4Mapped[1].startsWith('127.');
    }
  }
  return false;
}

/**
 * Validates the transport configuration before any HTTP server starts.
 * Returns a non-null error message when the combination is unsafe.
 *
 * Rule: HTTP transports (SSE / Streamable HTTP) bound to a non-loopback
 * interface must run with AUTH_MODE=oauth. A PAT-mode HTTP server on
 * 0.0.0.0 (or any LAN-reachable address) is unauthenticated and exposes
 * the operator's GitLab PAT to anyone who can reach the port.
 */
export function requireSafeTransportConfig(opts: {
  useSSE: boolean;
  useStreamableHttp: boolean;
  host: string;
  authMode: string;
}): string | null {
  if (!opts.useSSE && !opts.useStreamableHttp) return null;
  if (isLoopbackHost(opts.host)) return null;
  if (opts.authMode === 'oauth') return null;
  return (
    `HTTP transport on non-loopback bind (HOST=${opts.host}) requires AUTH_MODE=oauth. ` +
    `Set HOST=127.0.0.1 for single-tenant local dev, or set AUTH_MODE=oauth and front the ` +
    `server with a gateway that injects Authorization: Bearer.`
  );
}

/**
 * CORS origin allowlist parsed from CORS_ALLOW_ORIGINS env var.
 * - When empty AND AUTH_MODE=pat AND bind is loopback: permissive `*` (local dev).
 * - When empty AND AUTH_MODE=pat AND bind is non-loopback: no Allow-Origin header.
 *   (The startup guard refuses this combination, but the CORS path also defends
 *   in case the guard is bypassed in tests or future refactors.)
 * - When empty AND AUTH_MODE=oauth: no Allow-Origin header (deny browser access).
 * - When set: only listed origins receive the Allow-Origin header.
 *
 * Read lazily at request time to support runtime configuration and testing.
 */
function getCorsAllowedOrigins(): string[] {
  return (process.env.CORS_ALLOW_ORIGINS ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);
}

function getAuthModeEnv(): string {
  return (process.env.AUTH_MODE || 'pat').toLowerCase();
}

/**
 * SHA-256 hash of a Bearer token. Used to bind a session to its
 * originating Authorization header without storing the raw token in memory.
 */
function hashBearer(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function extractBearer(req: IncomingMessage): string | null {
  const authHeader = req.headers["authorization"];
  const headerStr = Array.isArray(authHeader) ? authHeader[0] : (authHeader || "");
  // String-based parse to avoid regex backtracking on attacker-controlled
  // headers. CodeQL js/polynomial-redos flagged the previous
  // `/^Bearer\s+(.+)$/i` as polynomial-time on inputs like `Bearer ` plus
  // many whitespace characters: overlapping `\s+` and greedy `(.+)` force
  // expensive backtracking before `$` decides match/no-match (CWE-1333).
  if (headerStr.length <= 6) return null;
  if (headerStr.substring(0, 6).toLowerCase() !== "bearer") return null;
  const sep = headerStr[6];
  if (sep !== ' ' && sep !== '\t') return null;
  const token = headerStr.substring(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Transport configuration options
 */
export interface TransportOptions {
  /**
   * Port to use for HTTP transport (default: 3000)
   */
  port?: number;

  /**
   * Bind address for HTTP transport.
   * Default: "127.0.0.1" (loopback only). Use "0.0.0.0" or a specific
   * interface address to expose to the network — but only with
   * AUTH_MODE=oauth, otherwise the server refuses to start.
   */
  host?: string;

  /**
   * Whether to use SSE transport (default: false, uses stdio)
   */
  useSSE?: boolean;

  /**
   * Whether to enable Streamable HTTP transport on /mcp (default: false).
   * Can be enabled together with legacy SSE transport.
   */
  useStreamableHttp?: boolean;

  /**
   * Optional factory function used in OAuth mode.
   * When provided, a new MCP Server is created per SSE connection
   * using the Bearer token extracted from the Authorization header.
   * If absent, the `server` argument is used directly (PAT mode).
   */
  serverFactory?: (token: string) => Server;
}

/**
 * Sets up the appropriate transport for the server based on the options
 *
 * @param server - The MCP server instance (PAT mode). Pass null when using serverFactory.
 * @param options - Transport configuration options
 * @returns A promise that resolves when the transport is set up
 */
export async function setupTransport(
  server: Server | null,
  options: TransportOptions = {}
): Promise<void> {
  const {
    port = 3000,
    host = '127.0.0.1',
    useSSE = false,
    useStreamableHttp = false,
    serverFactory,
  } = options;

  // Defense in depth: even if a caller bypasses the index.ts startup guard,
  // refuse to bind an unauthenticated HTTP server to a non-loopback address.
  const configError = requireSafeTransportConfig({
    useSSE,
    useStreamableHttp,
    host,
    authMode: getAuthModeEnv(),
  });
  if (configError) {
    throw new Error(`Refusing to start transport: ${configError}`);
  }

  /**
   * sessionId → SHA-256(originating Bearer token).
   * Populated at session creation in OAuth mode; consulted on every
   * subsequent request that re-uses the sessionId. A leaked sessionId
   * without the original Bearer is unusable.
   *
   * In PAT mode (serverFactory absent), no entries are stored, so the
   * lookup short-circuits and behaves as before.
   */
  const sessionBearerHashes: Map<string, string> = new Map();

  /**
   * Build the per-connection MCP Server and capture the Bearer hash if
   * we're in OAuth mode. Returns null when the request is unauthenticated
   * in OAuth mode (caller should respond 401).
   */
  const buildSessionContext = (
    req: IncomingMessage
  ): { server: Server; bearerHash: string | null } | null => {
    if (!serverFactory) {
      return server ? { server, bearerHash: null } : null;
    }
    // If a static server is also provided, this is PAT mode with per-session
    // factory (needed for streamable-http multi-session). No Bearer required.
    if (server) {
      return { server: serverFactory(''), bearerHash: null };
    }
    // OAuth mode: Bearer is mandatory
    const token = extractBearer(req);
    if (!token) return null;
    return { server: serverFactory(token), bearerHash: hashBearer(token) };
  };

  /**
   * In OAuth mode, every request that uses an existing sessionId must
   * present the same Bearer that opened the session. Returns true when
   * the session is unbound (PAT mode) or when the hash matches.
   *
   * Comparison uses crypto.timingSafeEqual to prevent a timing-based
   * oracle attack against the stored hash (both hashes are 32-byte
   * SHA-256 digests rendered as 64-char hex; we compare the raw bytes).
   */
  const sessionBearerMatches = (sessionId: string, req: IncomingMessage): boolean => {
    const expectedHash = sessionBearerHashes.get(sessionId);
    if (!expectedHash) return true; // PAT mode session → no hash to match
    const token = extractBearer(req);
    if (!token) return false;
    const actualHash = hashBearer(token);
    if (actualHash.length !== expectedHash.length) return false;
    return timingSafeEqual(
      Buffer.from(actualHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  };

  if (useSSE || useStreamableHttp) {
    // Store active transports by session ID for both legacy SSE and Streamable HTTP.
    const transports: {
      [sessionId: string]: SSEServerTransport | StreamableHTTPServerTransport;
    } = {};

    // Create raw HTTP server
    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS handling — wildcard only on loopback in PAT mode; allowlist otherwise.
      const corsOrigins = getCorsAllowedOrigins();
      const authMode = getAuthModeEnv();
      const requestOrigin = req.headers.origin;
      let corsAllowed = false;
      if (requestOrigin && corsOrigins.length > 0 && corsOrigins.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin');
        corsAllowed = true;
      } else if (corsOrigins.length === 0 && authMode === 'pat' && isLoopbackHost(host)) {
        // Loopback-only convenience for single-tenant local dev. Never
        // emit wildcard `*` on a network-exposed bind, even in PAT mode.
        res.setHeader('Access-Control-Allow-Origin', '*');
        corsAllowed = true;
      }
      // else: no Allow-Origin header → browser refuses to surface the response

      if (corsAllowed) {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id');
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const { pathname, query } = parse(req.url || '', true);

      try {
        // --- Health endpoints ---------------------------------------------------
        if (req.method === 'GET' && pathname === '/livez') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        // /healthz is a deprecated alias of /readyz; removed in 0.8.0.
        if (req.method === 'GET' && (pathname === '/readyz' || pathname === '/healthz')) {
          const sessionCount = Object.keys(transports).length;
          const maxSessions = parseInt(process.env.HEALTHZ_MAX_SESSIONS || '10000', 10);
          if (sessionCount >= maxSessions) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'unhealthy', reason: 'session_limit_exceeded', sessions: sessionCount }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', sessions: sessionCount }));
          return;
        }
        else if (useStreamableHttp && pathname === '/mcp' && (req.method === 'GET' || req.method === 'POST' || req.method === 'DELETE')) {
          const sessionIdHeader = req.headers['mcp-session-id'];
          const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

          let transport: StreamableHTTPServerTransport | null = null;
          if (sessionId) {
            const existingTransport = transports[sessionId];
            if (existingTransport instanceof StreamableHTTPServerTransport) {
              // OAuth-mode sessions are bound to the originating Bearer hash;
              // a leaked sessionId without the original Bearer is rejected here.
              if (!sessionBearerMatches(sessionId, req)) {
                res.writeHead(401, { 'Content-Type': 'text/plain' });
                res.end('Unauthorized: Authorization does not match the Bearer that opened this session');
                return;
              }
              transport = existingTransport;
            } else if (existingTransport) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: 'Bad Request: Session exists but uses a different transport protocol'
                },
                id: null
              }));
              return;
            } else {
              // Session ID was provided but not found — reject
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: 'Bad Request: Session not found or expired'
                },
                id: null
              }));
              return;
            }
          }

          if (!transport && req.method === 'POST') {
            const ctx = buildSessionContext(req);
            if (!ctx) {
              res.writeHead(401, { 'Content-Type': 'text/plain' });
              res.end('Unauthorized: missing or invalid Authorization: Bearer <token> header');
              return;
            }

            let initializedSid: string | undefined;
            const newTransport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (sid: string) => {
                initializedSid = sid;
                transports[sid] = newTransport;
                if (ctx.bearerHash) {
                  sessionBearerHashes.set(sid, ctx.bearerHash);
                }
              }
            });

            newTransport.onclose = () => {
              const sid = newTransport.sessionId;
              if (sid && transports[sid] === newTransport) {
                delete transports[sid];
                sessionBearerHashes.delete(sid);
              }
            };

            try {
              await ctx.server.connect(newTransport);
            } catch (connectError) {
              // Clean up if connect fails — onsessioninitialized may have fired
              if (initializedSid) {
                delete transports[initializedSid];
                sessionBearerHashes.delete(initializedSid);
              }
              try { await newTransport.close?.(); } catch { /* best-effort */ }
              throw connectError;
            }
            transport = newTransport;
          }

          if (!transport) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided'
              },
              id: null
            }));
            return;
          }

          await transport.handleRequest(req, res);
        }
        else if (req.method === 'GET' && pathname === '/sse') {
          if (!useSSE) {
            res.writeHead(404);
            res.end();
            return;
          }

          const ctx = buildSessionContext(req);
          if (!ctx) {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Unauthorized: missing or invalid Authorization: Bearer <token> header');
            return;
          }

          // Create a new SSE transport
          const sseTransport = new SSEServerTransport("/messages", res);

          // Idempotent cleanup helper
          const cleanupSse = () => {
            if (transports[sseTransport.sessionId] === sseTransport) {
              delete transports[sseTransport.sessionId];
              sessionBearerHashes.delete(sseTransport.sessionId);
            }
          };

          // Clean up on TCP close
          req.on("close", cleanupSse);

          // Clean up on SDK-initiated graceful close
          sseTransport.onclose = cleanupSse;

          // Connect the server to the transport — only register on success
          await ctx.server.connect(sseTransport);
          transports[sseTransport.sessionId] = sseTransport;
          if (ctx.bearerHash) {
            sessionBearerHashes.set(sseTransport.sessionId, ctx.bearerHash);
          }
        }
        else if (req.method === 'POST' && pathname === '/messages') {
          if (!useSSE) {
            res.writeHead(404);
            res.end();
            return;
          }

          const sessionId = query.sessionId as string;
          const transport = transports[sessionId];

          if (!(transport instanceof SSEServerTransport)) {
            res.writeHead(400);
            res.end('No transport found for sessionId');
            return;
          }

          // OAuth-mode sessions: require the same Bearer that opened /sse.
          // PAT-mode sessions are unbound and pass through (sessionBearerMatches returns true).
          if (!sessionBearerMatches(sessionId, req)) {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Unauthorized: Authorization does not match the Bearer that opened this session');
            return;
          }

          // Pass the raw Node.js request to the transport
          await transport.handlePostMessage(req, res);
        }
        else {
          res.writeHead(404);
          res.end();
        }
      } catch (error) {
        console.error('Server error:', error);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end('Internal server error');
        }
      }
    });

    // Start the server on the configured host (default 127.0.0.1).
    httpServer.listen(port, host, () => {
      console.error(`MCP HTTP transport listening on ${host}:${port}`);
    });
  } else {
    // Set up stdio transport (PAT mode only — server is always provided)
    const transport = new StdioServerTransport();
    await server!.connect(transport);
  }
}
