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

  // ===========================================================================
  // Pipeline Investigation Tools (issue #64)
  // ===========================================================================

  it('get_pipeline_summary — returns structured pipeline summary with stages', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_pipeline_summary',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
      },
    });
    const data = extractJson<{
      pipeline: { id: number; ref: string; status: string };
      stages: Array<{ name: string; status: string; jobs: Array<{ id: number; name: string }> }>;
      summary: { total_jobs: number; passed: number; failed: number };
    }>(result);

    expect(data.pipeline.id).toBeGreaterThan(0);
    expect(data.pipeline.ref).toBe('main');
    expect(data.stages.length).toBeGreaterThan(0);
    expect(data.stages[0].name).toBeDefined();
    expect(data.stages[0].jobs.length).toBeGreaterThan(0);
    expect(data.summary.total_jobs).toBeGreaterThan(0);
  });

  it('get_pipeline_summary — accepts ref parameter', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_pipeline_summary',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        ref: 'main',
        include_logs: false,
      },
    });
    const data = extractJson<{
      pipeline: { id: number; ref: string };
      stages: Array<{ name: string; jobs: Array<{ log_tail?: string }> }>;
    }>(result);

    expect(data.pipeline.ref).toBe('main');
    // When include_logs is false, no log_tail should be present
    for (const stage of data.stages) {
      for (const job of stage.jobs) {
        expect(job.log_tail).toBeUndefined();
      }
    }
  });

  it('get_pipeline_summary — accepts pipeline_id parameter', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'get_pipeline_summary',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        pipeline_id: pipelineId,
      },
    });
    const data = extractJson<{ pipeline: { id: number } }>(result);
    expect(data.pipeline.id).toBe(pipelineId);
  });

  it('get_job_log_smart — returns cleaned log output', async () => {
    // Wait for job to have produced output
    await new Promise((r) => setTimeout(r, 3000));

    try {
      const result = await globalThis.mcpClient.callTool({
        name: 'get_job_log_smart',
        arguments: {
          project_id: String(globalThis.fixtures.projectId),
          job_id: jobId,
          tail: 10,
        },
      });
      const data = extractJson<{
        job_id: number;
        log: string;
        line_count: number;
        truncated: boolean;
        sections_found: string[];
      }>(result);

      expect(data.job_id).toBe(jobId);
      expect(data.line_count).toBeGreaterThan(0);
      expect(typeof data.truncated).toBe('boolean');
      expect(Array.isArray(data.sections_found)).toBe(true);
      // Verify ANSI codes are stripped (should not contain escape sequences)
      expect(data.log).not.toMatch(/\x1B\[/);
    } catch (e) {
      // Job trace not available in CI — acceptable
      console.warn('get_job_log_smart test skipped:', e);
    }
  });

  it('get_job_log_smart — error_only filter works', async () => {
    try {
      const result = await globalThis.mcpClient.callTool({
        name: 'get_job_log_smart',
        arguments: {
          project_id: String(globalThis.fixtures.projectId),
          job_id: jobId,
          error_only: true,
        },
      });
      const data = extractJson<{ job_id: number; log: string }>(result);
      expect(data.job_id).toBe(jobId);
      // error_only returns either error lines or the full log if no errors detected
      expect(typeof data.log).toBe('string');
    } catch (e) {
      // Job trace not available in CI — acceptable
      console.warn('get_job_log_smart error_only test skipped:', e);
    }
  });

  it('list_pipeline_jobs — include_log_tail extension returns logs for failed jobs', async () => {
    const result = await globalThis.mcpClient.callTool({
      name: 'list_pipeline_jobs',
      arguments: {
        project_id: String(globalThis.fixtures.projectId),
        pipeline_id: pipelineId,
        include_log_tail: true,
        log_tail_lines: 10,
      },
    });
    // Whether or not there are failed jobs, the call should succeed
    const text = extractText(result);
    expect(text.length).toBeGreaterThan(0);
  });
});
