import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import { GitLabPipelineManager } from '../src/gitlab-pipeline-manager.js';

const apiUrl = 'https://gitlab.example.com/api/v4';
const token = 'test-token';

let manager: GitLabPipelineManager;
let mock: AxiosMockAdapter;

beforeEach(() => {
  manager = new GitLabPipelineManager({ apiUrl, token });
  mock = new AxiosMockAdapter((manager as any).axios);
});

afterEach(() => {
  mock.restore();
});

describe('GitLabPipelineManager', () => {
  it('validates pipeline configuration', async () => {
    mock
      .onPost(`/projects/my%2Fproject/ci/lint`)
      .reply(200, { status: 'valid', errors: [], warnings: [], merged_yaml: 'yaml' });

    const result = await manager.validatePipeline('my/project', 'config');
    expect(result).toEqual({ valid: true, errors: [], warnings: [], mergedYaml: 'yaml' });
  });

  it('triggers a pipeline', async () => {
    const pipeline = { id: 1, status: 'pending', ref: 'main', sha: 'abc', web_url: 'url' };
    mock
      .onPost(`/projects/123/pipeline`, { ref: 'main', variables: [] })
      .reply(200, pipeline);

    const result = await manager.triggerPipeline('123', 'main');
    expect(result).toEqual(pipeline);
  });

  it('retrieves pipeline info', async () => {
    const pipeline = { id: 2, status: 'success', ref: 'main', sha: 'def', web_url: 'url2' };
    mock
      .onGet(`/projects/123/pipelines/2`)
      .reply(200, pipeline);

    const result = await manager.getPipeline('123', 2);
    expect(result).toEqual(pipeline);
  });

  it('fetches job log', async () => {
    const logText = 'job log';
    mock
      .onGet(`/projects/123/jobs/99/trace`)
      .reply(200, logText);

    const result = await manager.getJobLog('123', 99);
    expect(result).toBe(logText);
  });
});
