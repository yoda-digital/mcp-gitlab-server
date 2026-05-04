import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse } from "url";

/**
 * CORS origin allowlist parsed from CORS_ALLOW_ORIGINS env var.
 * - When empty AND AUTH_MODE=pat: permissive `*` (single-tenant local dev).
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
 * Transport configuration options
 */
export interface TransportOptions {
  /**
   * Port to use for SSE transport (default: 3000)
   */
  port?: number;

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
  const { port = 3000, useSSE = false, useStreamableHttp = false, serverFactory } = options;

  const getSessionServer = (req: IncomingMessage): Server | null => {
    if (!serverFactory) {
      // PAT mode: reuse the single pre-built server.
      return server;
    }

    // OAuth mode: extract Bearer token from Authorization header.
    const authHeader = req.headers["authorization"] || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return null;
    }
    return serverFactory(match[1].trim());
  };

  if (useSSE || useStreamableHttp) {
    // Store active transports by session ID for both legacy SSE and Streamable HTTP.
    const transports: {
      [sessionId: string]: SSEServerTransport | StreamableHTTPServerTransport;
    } = {};

    // Create raw HTTP server
    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS handling — restrict origins in OAuth mode
      const corsOrigins = getCorsAllowedOrigins();
      const authMode = getAuthModeEnv();
      const requestOrigin = req.headers.origin;
      let corsAllowed = false;
      if (requestOrigin && corsOrigins.length > 0 && corsOrigins.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin');
        corsAllowed = true;
      } else if (corsOrigins.length === 0 && authMode === 'pat') {
        // Single-tenant local dev — keep permissive default
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
        if (req.method === 'GET' && pathname === '/healthz') {
          const sessionCount = Object.keys(transports).length;
          const maxSessions = parseInt(process.env.HEALTHZ_MAX_SESSIONS || '10000', 10);
          if (sessionCount > maxSessions) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'unhealthy', reason: 'session_limit_exceeded', sessions: sessionCount }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', sessions: sessionCount }));
        }
        else if (useStreamableHttp && pathname === '/mcp' && (req.method === 'GET' || req.method === 'POST' || req.method === 'DELETE')) {
          const sessionIdHeader = req.headers['mcp-session-id'];
          const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

          let transport: StreamableHTTPServerTransport | null = null;
          if (sessionId) {
            const existingTransport = transports[sessionId];
            if (existingTransport instanceof StreamableHTTPServerTransport) {
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
            const sessionServer = getSessionServer(req);
            if (!sessionServer) {
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
              }
            });

            newTransport.onclose = () => {
              const sid = newTransport.sessionId;
              if (sid && transports[sid] === newTransport) {
                delete transports[sid];
              }
            };

            try {
              await sessionServer.connect(newTransport);
            } catch (connectError) {
              // Clean up if connect fails — onsessioninitialized may have fired
              if (initializedSid) delete transports[initializedSid];
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

          // Determine which server instance to use for this connection
          const sessionServer = getSessionServer(req);
          if (!sessionServer) {
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
            }
          };

          // Clean up on TCP close
          req.on("close", cleanupSse);

          // Clean up on SDK-initiated graceful close
          sseTransport.onclose = cleanupSse;

          // Connect the server to the transport — only register on success
          await sessionServer.connect(sseTransport);
          transports[sseTransport.sessionId] = sseTransport;
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

    // Start the server
    httpServer.listen(port, () => {
      console.error(`SSE server listening on port ${port}`);
    });
  } else {
    // Set up stdio transport (PAT mode only — server is always provided)
    const transport = new StdioServerTransport();
    await server!.connect(transport);
  }
}