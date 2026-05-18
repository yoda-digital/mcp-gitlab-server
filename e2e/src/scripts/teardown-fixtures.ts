/**
 * Teardown GitLab fixtures after E2E tests.
 * Removes the test group (cascades to project, issues, MRs, etc.)
 */
import fetch from 'node-fetch';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const GITLAB_URL = process.env.GITLAB_URL || 'http://localhost:8080';

interface Fixtures {
  token: string;
  groupId: number;
}

async function teardown() {
  // See provision-fixtures.ts for rationale on the default path.
  const fixturesDir = process.env.FIXTURES_DIR || './fixtures';
  const fixturePath = resolve(fixturesDir, 'fixtures.json');

  if (!existsSync(fixturePath)) {
    console.log('⚠️  No fixtures.json found — nothing to tear down.');
    return;
  }

  // lgtm[js/file-access-to-http] — intentional: reading test fixtures token for cleanup
  const fixtures: Fixtures = JSON.parse(readFileSync(fixturePath, 'utf-8'));

  console.log('🧹 Tearing down GitLab fixtures...');

  // Delete the test group (cascades to project + all data)
  const res = await fetch(`${GITLAB_URL}/api/v4/groups/${fixtures.groupId}`, {
    method: 'DELETE',
    headers: { 'PRIVATE-TOKEN': fixtures.token },
  });

  if (res.ok || res.status === 404) {
    console.log('   ✅ Test group deleted');
  } else {
    console.error(`   ❌ Group deletion failed (${res.status}): ${await res.text()}`);
  }

  // Clean up fixtures file
  unlinkSync(fixturePath);
  console.log('✅ Teardown complete');
}

teardown().catch((err) => {
  console.error('❌ Teardown failed:', err);
  process.exit(1);
});
