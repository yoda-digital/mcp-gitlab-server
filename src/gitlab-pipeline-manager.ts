import axios, { AxiosError, AxiosInstance } from 'axios';

/**
 * Configuration options for {@link GitLabPipelineManager}.
 */
export interface GitLabPipelineManagerConfig {
  /** Base URL of the GitLab API (e.g. https://gitlab.com/api/v4). */
  apiUrl: string;
  /** Personal access token used for authentication. */
  token: string;
}

/** Result of linting a GitLab CI configuration. */
export interface PipelineValidationResult {
  /** Indicates whether the configuration is valid. */
  valid: boolean;
  /** Lint errors returned by GitLab when invalid. */
  errors: string[];
  /** Lint warnings returned by GitLab. */
  warnings: string[];
  /** The merged YAML as returned by the GitLab API. */
  mergedYaml?: string;
}

/** Basic representation of a GitLab pipeline. */
export interface GitLabPipeline {
  id: number;
  status: string;
  ref: string;
  sha: string;
  web_url: string;
}

/** Representation of a GitLab job. */
export interface GitLabJob {
  id: number;
  status: string;
  stage?: string;
  name?: string;
  ref?: string;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: number | null;
  web_url?: string;
}

/**
 * GitLabPipelineManager provides helpers for validating and executing
 * GitLab CI/CD pipelines.
 */
export class GitLabPipelineManager {
  private axios: AxiosInstance;

  constructor(config: GitLabPipelineManagerConfig) {
    this.axios = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Private-Token': config.token,
      },
    });
  }

  /**
   * Validates a `.gitlab-ci.yml` file using GitLab CI lint API.
   *
   * @param projectId - ID or URL-encoded path of the project.
   * @param content - YAML content of the pipeline configuration.
   * @returns Validation result describing validity and errors.
   */
  async validatePipeline(
    projectId: string,
    content: string,
  ): Promise<PipelineValidationResult> {
    try {
      const response = await this.axios.post(
        `/projects/${encodeURIComponent(projectId)}/ci/lint`,
        { content },
      );

      return {
        valid: response.data.status === 'valid',
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
        mergedYaml: response.data.merged_yaml,
      };
    } catch (err) {
      this.handleAxiosError('Failed to lint pipeline', err);
      throw err;
    }
  }

  /**
   * Triggers a new pipeline for the specified ref.
   *
   * @param projectId - ID or path of the project.
   * @param ref - Branch or tag name to run the pipeline on.
   * @param variables - Optional variables to inject into the pipeline.
   * @returns The created pipeline object.
   */
  async triggerPipeline(
    projectId: string,
    ref: string,
    variables: Record<string, string> = {},
  ): Promise<GitLabPipeline> {
    try {
      const vars = Object.entries(variables).map(([key, value]) => ({
        key,
        value,
      }));

      const response = await this.axios.post(
        `/projects/${encodeURIComponent(projectId)}/pipeline`,
        { ref, variables: vars },
      );

      return response.data as GitLabPipeline;
    } catch (err) {
      this.handleAxiosError('Failed to trigger pipeline', err);
      throw err;
    }
  }

  /**
   * Retrieves a pipeline by ID.
   *
   * @param projectId - ID or path of the project.
   * @param pipelineId - The pipeline ID.
   * @returns The pipeline details.
   */
  async getPipeline(
    projectId: string,
    pipelineId: number,
  ): Promise<GitLabPipeline> {
    try {
      const response = await this.axios.get(
        `/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}`,
      );
      return response.data as GitLabPipeline;
    } catch (err) {
      this.handleAxiosError('Failed to fetch pipeline', err);
      throw err;
    }
  }

  /**
   * Lists jobs for a specific pipeline.
   *
   * @param projectId - ID or path of the project.
   * @param pipelineId - The pipeline ID.
   * @returns Array of jobs associated with the pipeline.
   */
  async listPipelineJobs(
    projectId: string,
    pipelineId: number,
  ): Promise<GitLabJob[]> {
    try {
      const response = await this.axios.get(
        `/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/jobs`,
      );
      return response.data as GitLabJob[];
    } catch (err) {
      this.handleAxiosError('Failed to fetch pipeline jobs', err);
      throw err;
    }
  }

  /**
   * Retrieves a single job by ID.
   *
   * @param projectId - ID or path of the project.
   * @param jobId - The job ID.
   * @returns The job details.
   */
  async getJob(
    projectId: string,
    jobId: number,
  ): Promise<GitLabJob> {
    try {
      const response = await this.axios.get(
        `/projects/${encodeURIComponent(projectId)}/jobs/${jobId}`,
      );
      return response.data as GitLabJob;
    } catch (err) {
      this.handleAxiosError('Failed to fetch job', err);
      throw err;
    }
  }

  /**
   * Retrieves the raw log for a job.
   *
   * @param projectId - ID or path of the project.
   * @param jobId - The job ID.
   * @returns Job log as plain text.
   */
  async getJobLog(
    projectId: string,
    jobId: number,
  ): Promise<string> {
    try {
      const response = await this.axios.get(
        `/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/trace`,
        { responseType: 'text' },
      );
      return response.data as string;
    } catch (err) {
      this.handleAxiosError('Failed to retrieve job log', err);
      throw err;
    }
  }

  private handleAxiosError(context: string, error: unknown): void {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const message = (axiosError.response?.data as any)?.message || axiosError.message;
      console.error(`${context}: [${status}] ${message}`);
    } else if (error instanceof Error) {
      console.error(`${context}: ${error.message}`);
    } else {
      console.error(context, error);
    }
  }
}
