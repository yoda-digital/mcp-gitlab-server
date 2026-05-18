/**
 * Global setup for E2E tests.
 *
 * 1. Provisions GitLab fixtures (group, project, issues, MR, wiki, etc.)
 * 2. Establishes a shared MCP client connection to the server under test.
 * 3. Exposes the client and fixture metadata to all tests via globalThis.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { beforeAll, afterAll } from 'vitest';
import type { Fixtures } from '../helpers/types.js';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

declare global {
  // eslint-disable-next-line no-var
  var mcpClient: Client;
  // eslint-disable-next-line no-var
  var fixtures: Fixtures;
}

beforeAll(async () => {
  // Load fixtures (provisioned before test run). See provision-fixtures.ts
  // for default-path rationale: ./fixtures works for both host and container.
  const fixturesDir = process.env.FIXTURES_DIR || './fixtures';
  const fixturePath = resolve(fixturesDir, 'fixtures.json');
  if (!existsSync(fixturePath)) {
    throw new Error(
      'fixtures.json not found. Run `npm run provision` or use the CI workflow which provisions automatically.'
    );
  }
  globalThis.fixtures = JSON.parse(readFileSync(fixturePath, 'utf-8'));

  // Connect MCP client via Streamable HTTP
  const client = new Client({ name: 'e2e-test-client', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_SERVER_URL}/mcp`));
  await client.connect(transport);

  globalThis.mcpClient = client;
}, 60_000);

afterAll(async () => {
  if (globalThis.mcpClient) {
    await globalThis.mcpClient.close();
  }
});
