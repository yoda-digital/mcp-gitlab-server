import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { GitLabApi } from '../src/gitlab-api.js';

// Mock server setup for testing
export function createTestServer() {
  const server = new Server({
    name: "@dangerusslee/gitlab-mcp-server",
    version: "test",
  }, {
    capabilities: { tools: {} }
  });

  // Create GitLab API client with test configuration
  const gitlabApi = new GitLabApi({
    apiUrl: process.env.GITLAB_API_URL || 'https://gitlab.example.com/api/v4',
    token: process.env.GITLAB_PERSONAL_ACCESS_TOKEN || 'test-token'
  });

  return { server, gitlabApi };
}

// Export a configured server instance
export const { server } = createTestServer();