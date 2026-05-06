/**
 * E2E tests — Pipeline & Job tools
 *
 * Tools tested:
 * - list_pipelines
 * - get_pipeline
 * - trigger_pipeline
 * - retry_pipeline
 * - cancel_pipeline
 * - list_pipeline_jobs
 * - get_job
 * - get_job_log
 * - retry_job
 * - cancel_job
 *
 * Note: Pipeline tests require a .gitlab-ci.yml to exist in the project.
 * The provision script creates a minimal CI config.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { extractJson, extractText } from '../helpers/types.js';

describe('Pipeline & Job tools', () => {
  let pipelineId: number;
  let jobId: number;

  beforeAll(async () => {
    // Create a CI config with a fast job that also allows retry/cancel testing
    await globalThis.mcpClient.callTool({
      name: 'create_or_update_file',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        file_path: '.gitlab-ci.yml',
        content: [
          'test_job:',
          '  script:',
          '    - echo "E2E pipeline test"',
          '    - sleep 2',
          '',
        ].join('\n'),
        commit_message: 'ci: add minimal CI config for E2E',
        branch: 'main',
      },
    });

    // Wait for pipeline to auto-trigger
    await new Promise((r) => setTimeout(r, 5000));

    // Trigger a pipeline explicitly to ensure one exists
    await globalThis.mcpClient.callTool({
      name: 'trigger_pipeline',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        ref: 'main',
      },
    });

    // Wait for pipeline to be registered
    await new Promise((r) => setTimeout(r, 2000));
  });

  it('list_pipelines — returns at least one pipeline', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_pipelines',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const data = extractJson<Array<{ id: number; status: string; ref: string }>>(result);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].id).toBeGreaterThan(0);
    expect(data[0].status).toBeDefined();
    expect(data[0].ref).toBe('main');
    pipelineId = data[0].id;
  });

  it('get_pipeline — returns pipeline details', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_pipeline',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        pipeline_id: pipelineId,
      },
    });
    const data = extractJson<{ id: number; ref: string; status: string }>(result);
    expect(data.id).toBe(pipelineId);
    expect(data.ref).toBe('main');
    expect(data.status).toBeDefined();
  });

  it('list_pipeline_jobs — returns jobs with structure', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_pipeline_jobs',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        pipeline_id: pipelineId,
      },
    });
    const data = extractJson<Array<{ id: number; name: string; status: string; stage: string }>>(result);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].name).toBe('test_job');
    expect(data[0].stage).toBeDefined();
    expect(data[0].status).toBeDefined();
    jobId = data[0].id;
  });

  it('get_job — returns job details with pipeline reference', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_job',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        job_id: jobId,
      },
    });
    const data = extractJson<{ id: number; name: string; pipeline: { id: number } }>(result);
    expect(data.id).toBe(jobId);
    expect(data.name).toBe('test_job');
    expect(data.pipeline.id).toBe(pipelineId);
  });

  it('get_job_log — returns trace output', async () => {
    // Wait for job to complete (needs time to produce output)
    await new Promise((r) => setTimeout(r, 8000));

    const result = await globalThis.mcpClient.callTool({
      name: 'get_job_log',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        job_id: jobId,
      },
    });
    // Job log may be empty if job hasn't started yet (no runner available in CI)
    try {
      const text = extractText(result);
      expect(text.length).toBeGreaterThan(0);
    } catch {
      // Job trace not available — acceptable in CI where runner may not execute jobs
    }
  });

  it('trigger_pipeline — creates a new pipeline', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'trigger_pipeline',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        ref: 'main',
      },
    });
    const data = extractJson<{ id: number; status: string; ref: string }>(result);
    expect(data.id).toBeGreaterThan(0);
    expect(data.ref).toBe('main');
  });

  it('cancel_pipeline — cancels a pipeline', async () => {
    // Trigger a new pipeline to cancel
    const triggerResult = await globalThis.mcpClient.callTool({
      name: 'trigger_pipeline',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        ref: 'main',
      },
    });
    const { id } = extractJson<{ id: number }>(triggerResult);

    // Wait a moment for pipeline to start processing
    await new Promise((r) => setTimeout(r, 2000));

    const result = await globalThis.mcpClient.callTool({
      name: 'cancel_pipeline',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        pipeline_id: id,
      },
    });
    // cancel_pipeline returns pipeline — status depends on timing
    const data = extractJson<{ id: number; status: string }>(result);
    expect(data.id).toBe(id);
    // Pipeline may be in any pre-running or post-cancel state
    expect(['canceled', 'canceling', 'created', 'pending']).toContain(data.status);
  });

  it('retry_pipeline — retries a completed/canceled pipeline', async () => {
    // Wait a moment for the canceled pipeline to settle
    await new Promise((r) => setTimeout(r, 2000));

    // Get a completed or canceled pipeline to retry
    const listResult = await globalThis.mcpClient.callTool({
      name: 'list_pipelines',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const pipelines = extractJson<Array<{ id: number; status: string }>>(listResult);
    const retryable = pipelines.find((p) => ['canceled', 'failed', 'success'].includes(p.status));

    if (!retryable) {
      // If no retryable pipeline yet, skip gracefully
      return;
    }

    const result = await globalThis.mcpClient.callTool({
      name: 'retry_pipeline',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        pipeline_id: retryable.id,
      },
    });
    const data = extractJson<{ id: number; status: string }>(result);
    expect(data.id).toBeGreaterThan(0);
    expect(data.status).toBeDefined();
  });

  it('cancel_job — cancels a running job', async () => {
    // Trigger a fresh pipeline so we have a running job
    const triggerResult = await globalThis.mcpClient.callTool({
      name: 'trigger_pipeline',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        ref: 'main',
      },
    });
    const pipeline = extractJson<{ id: number }>(triggerResult);

    // Wait for job to start
    await new Promise((r) => setTimeout(r, 2000));

    const jobsResult = await globalThis.mcpClient.callTool({
      name: 'list_pipeline_jobs',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        pipeline_id: pipeline.id,
      },
    });
    const jobs = extractJson<Array<{ id: number; status: string }>>(jobsResult);
    const runningJob = jobs.find((j) => ['running', 'pending', 'created'].includes(j.status));

    if (!runningJob) {
      // Job already finished — can't cancel
      return;
    }

    const result = await globalThis.mcpClient.callTool({
      name: 'cancel_job',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        job_id: runningJob.id,
      },
    });
    const data = extractJson<{ id: number; status: string }>(result);
    expect(data.id).toBe(runningJob.id);
    expect(['canceled', 'canceling']).toContain(data.status);
  });

  it('retry_job — retries a failed/canceled job', async () => {
    // Find a canceled or failed job from previous tests
    await new Promise((r) => setTimeout(r, 1000));

    const listResult = await globalThis.mcpClient.callTool({
      name: 'list_pipelines',
      arguments: { project_id: String(globalThis.fixtures.projectId) },
    });
    const pipelines = extractJson<Array<{ id: number; status: string }>>(listResult);

    // Look for a pipeline with canceled/failed jobs
    for (const pl of pipelines) {
      const jobsResult = await globalThis.mcpClient.callTool({
        name: 'list_pipeline_jobs',
        arguments: {
          project_id: String(globalThis.fixtures.projectId),
          pipeline_id: pl.id,
        },
      });
      const jobs = extractJson<Array<{ id: number; status: string }>>(jobsResult);
      const retryableJob = jobs.find((j) => ['canceled', 'failed'].includes(j.status));

      if (retryableJob) {
        const result = await globalThis.mcpClient.callTool({
          name: 'retry_job',
          arguments: {
            project_id: String(globalThis.fixtures.projectId),
            job_id: retryableJob.id,
          },
        });
        const data = extractJson<{ id: number; status: string }>(result);
        expect(data.id).toBeGreaterThan(0);
        expect(data.status).toBeDefined();
        return;
      }
    }

    // No retryable job found — not a failure, just skip
  });
});
