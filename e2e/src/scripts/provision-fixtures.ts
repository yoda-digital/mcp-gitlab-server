/**
 * Provision GitLab fixtures for E2E tests.
 *
 * Creates: root token, test group, test project, seed data (issues, branches, etc.)
 * Outputs fixture IDs to a JSON file consumed by tests.
 */
import fetch from 'node-fetch';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const GITLAB_URL = process.env.GITLAB_URL || 'http://localhost:8080';
const GITLAB_ROOT_PASSWORD = process.env.GITLAB_ROOT_PASSWORD || 'E2eTestPassword1!';

interface Fixtures {
  token: string;
  groupId: number;
  groupPath: string;
  projectId: number;
  projectPath: string;
  issueIid: number;
  mergeRequestIid: number;
  branchName: string;
  labelName: string;
  milestoneName: string;
  wikiPageSlug: string;
}

async function gitlabApi(path: string, options: { method?: string; body?: unknown; token?: string } = {}) {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['PRIVATE-TOKEN'] = token;

  const res = await fetch(`${GITLAB_URL}/api/v4${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitLab API ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function createPersonalAccessToken(): Promise<string> {
  // First, authenticate as root to get a session cookie / OAuth token
  // For GitLab CE fresh install, use the Personal Access Token API with root credentials
  const tokenRes = await fetch(`${GITLAB_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      username: 'root',
      password: GITLAB_ROOT_PASSWORD,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`OAuth login failed: ${await tokenRes.text()}`);
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // Create a PAT via admin endpoint (CE-compatible: /users/:id/personal_access_tokens)
  const pat = await fetch(`${GITLAB_URL}/api/v4/users/1/personal_access_tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      name: 'e2e-test-token',
      scopes: ['api', 'read_repository', 'write_repository'],
      expires_at: new Date(Date.now() + 86400000).toISOString().split('T')[0], // +1 day
    }),
  });

  if (!pat.ok) {
    throw new Error(`PAT creation failed: ${await pat.text()}`);
  }

  const { token } = (await pat.json()) as { token: string };
  return token;
}

async function provision(): Promise<Fixtures> {
  console.log('🔧 Provisioning GitLab fixtures...');

  // 1. Create API token
  console.log('   Creating personal access token...');
  const token = await createPersonalAccessToken();

  // 2. Create test group
  console.log('   Creating test group...');
  const group = (await gitlabApi('/groups', {
    method: 'POST',
    token,
    body: { name: 'E2E Test Group', path: 'e2e-test-group', visibility: 'private' },
  })) as { id: number; full_path: string };

  // 3. Create test project
  console.log('   Creating test project...');
  const project = (await gitlabApi('/projects', {
    method: 'POST',
    token,
    body: {
      name: 'e2e-test-project',
      namespace_id: group.id,
      initialize_with_readme: true,
      visibility: 'private',
      wiki_enabled: true,
      issues_enabled: true,
      merge_requests_enabled: true,
    },
  })) as { id: number; path_with_namespace: string };

  // 4. Create a branch
  console.log('   Creating test branch...');
  const branchName = 'feature/e2e-test';
  await gitlabApi(`/projects/${project.id}/repository/branches`, {
    method: 'POST',
    token,
    body: { branch: branchName, ref: 'main' },
  });

  // 5. Create a file on the branch (for MR diff)
  await gitlabApi(`/projects/${project.id}/repository/files/e2e-test.md`, {
    method: 'POST',
    token,
    body: {
      branch: branchName,
      content: '# E2E Test File\n\nThis file was created by the E2E test provisioner.',
      commit_message: 'test: add e2e test file',
    },
  });

  // 6. Create a label
  console.log('   Creating test label...');
  const labelName = 'e2e-test';
  await gitlabApi(`/projects/${project.id}/labels`, {
    method: 'POST',
    token,
    body: { name: labelName, color: '#428BCA' },
  });

  // 7. Create a milestone
  console.log('   Creating test milestone...');
  const milestoneName = 'E2E Sprint 1';
  await gitlabApi(`/projects/${project.id}/milestones`, {
    method: 'POST',
    token,
    body: { title: milestoneName },
  });

  // 8. Create an issue
  console.log('   Creating test issue...');
  const issue = (await gitlabApi(`/projects/${project.id}/issues`, {
    method: 'POST',
    token,
    body: { title: 'E2E test issue', description: 'Created by E2E provisioner', labels: labelName },
  })) as { iid: number };

  // 9. Create a merge request
  console.log('   Creating test merge request...');
  const mr = (await gitlabApi(`/projects/${project.id}/merge_requests`, {
    method: 'POST',
    token,
    body: {
      source_branch: branchName,
      target_branch: 'main',
      title: 'E2E test merge request',
      description: 'Created by E2E provisioner',
    },
  })) as { iid: number };

  // 10. Create a wiki page
  console.log('   Creating test wiki page...');
  const wiki = (await gitlabApi(`/projects/${project.id}/wikis`, {
    method: 'POST',
    token,
    body: { title: 'E2E Test Page', content: '# E2E Wiki\n\nTest content.' },
  })) as { slug: string };

  const fixtures: Fixtures = {
    token,
    groupId: group.id,
    groupPath: group.full_path,
    projectId: project.id,
    projectPath: project.path_with_namespace,
    issueIid: issue.iid,
    mergeRequestIid: mr.iid,
    branchName,
    labelName,
    milestoneName,
    wikiPageSlug: wiki.slug,
  };

  // Write fixtures to file. Default is ./fixtures relative to cwd so that
  // `npm run provision` from the e2e/ directory works on the host (writes
  // e2e/fixtures/). In-container runs (Dockerfile WORKDIR=/app) also resolve
  // ./fixtures to /app/fixtures, matching the previous behavior. Override
  // with FIXTURES_DIR for explicit paths.
  const outDir = process.env.FIXTURES_DIR || './fixtures';
  const outPath = resolve(outDir, 'fixtures.json');
  mkdirSync(dirname(outPath), { recursive: true });
  // lgtm[js/http-to-file-access] — intentional: test fixtures saved for E2E teardown
  writeFileSync(outPath, JSON.stringify(fixtures, null, 2));
  console.log(`✅ Fixtures written to ${outPath}`);

  return fixtures;
}

provision().catch((err) => {
  console.error('❌ Provisioning failed:', err);
  process.exit(1);
});
