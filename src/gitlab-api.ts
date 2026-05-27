import { z } from 'zod';
import fetch from "node-fetch";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
  GitLabForkSchema,
  GitLabReferenceSchema,
  GitLabRepositorySchema,
  GitLabIssueSchema,
  GitLabMergeRequestSchema,
  MergeRequestApprovalStateSchema,
  GitLabContentSchema,
  GitLabCreateUpdateFileResponseSchema,
  GitLabSearchResponseSchema,
  GitLabGroupProjectsResponseSchema,
  GitLabTreeSchema,
  GitLabCommitSchema,
  GitLabEventsResponseSchema,
  GitLabCommitsResponseSchema,
  GitLabIssuesResponseSchema,
  GitLabMergeRequestsResponseSchema,
  GitLabWikiPageSchema,
  GitLabWikiPagesResponseSchema,
  GitLabWikiAttachmentSchema,
  GitLabMemberSchema,
  CreateRepositoryOptionsSchema,
  CreateIssueOptionsSchema,
  CreateMergeRequestOptionsSchema,
  CreateBranchOptionsSchema,
  WikiPageFormatEnum,
  type GitLabFork,
  type GitLabReference,
  type GitLabRepository,
  type GitLabIssue,
  type GitLabMergeRequest,
  type MergeRequestApprovalState,
  type GitLabContent,
  type GitLabCreateUpdateFileResponse,
  type GitLabSearchResponse,
  type GitLabGroupProjectsResponse,
  type GitLabTree,
  type GitLabCommit,
  type GitLabEventsResponse,
  type GitLabCommitsResponse,
  type GitLabIssuesResponse,
  type GitLabMergeRequestsResponse,
  type GitLabWikiPage,
  type GitLabWikiPagesResponse,
  type GitLabWikiAttachment,
  type WikiPageFormat,
  type FileOperation,
  type GitLabMember,
  GitLabMembersResponseSchema,
  type GitLabMembersResponse,
  GitLabNoteSchema,
  GitLabNotesResponseSchema,
  type GitLabNote,
  type GitLabNotesResponse,
  GitLabDiscussionsResponseSchema,
  GitLabDiscussionSchema,
  type GitLabDiscussionsResponse,
  type GitLabDiscussion,
  // CI/CD types
  GitLabPipelineSchema,
  GitLabPipelinesResponseSchema,
  type GitLabPipeline,
  type GitLabPipelinesResponse,
  GitLabJobSchema,
  GitLabJobsResponseSchema,
  type GitLabJob,
  type GitLabJobsResponse,
  GitLabEnvironmentSchema,
  GitLabEnvironmentsResponseSchema,
  type GitLabEnvironment,
  type GitLabEnvironmentsResponse,
  // Repository types
  GitLabBranchSchema,
  GitLabBranchesResponseSchema,
  type GitLabBranch,
  type GitLabBranchesResponse,
  GitLabTagSchema,
  GitLabTagsResponseSchema,
  type GitLabTag,
  type GitLabTagsResponse,
  GitLabCompareResultSchema,
  type GitLabCompareResult,
  GitLabTreeResponseSchema,
  type GitLabTreeResponse,
  GitLabReleaseSchema,
  GitLabReleasesResponseSchema,
  type GitLabRelease,
  type GitLabReleasesResponse,
  // Label types
  GitLabLabelSchema,
  GitLabLabelsResponseSchema,
  type GitLabLabel,
  type GitLabLabelsResponse,
  // Milestone types
  GitLabMilestoneSchema,
  GitLabMilestonesResponseSchema,
  type GitLabMilestone,
  type GitLabMilestonesResponse,
  // MR Changes type
  GitLabMergeRequestChangesSchema,
  type GitLabMergeRequestChanges,
  // Protected Branch types
  GitLabProtectedBranchSchema,
  GitLabProtectedBranchesResponseSchema,
  type GitLabProtectedBranch,
  type GitLabProtectedBranchesResponse,
  // Project types
  GitLabProjectDetailSchema,
  type GitLabProjectDetail,
  // User types
  GitLabUserDetailSchema,
  GitLabUsersResponseSchema,
  type GitLabUserDetail,
  type GitLabUsersResponse,
  // Group types
  GitLabGroupSchema,
  GitLabGroupsResponseSchema,
  type GitLabGroup,
  type GitLabGroupsResponse,
} from './schemas.js';

/**
 * GitLab API client configuration
 */
export interface GitLabApiConfig {
  apiUrl: string;
  token: string;
}

/**
 * Stage status mirrors GitLab's aggregation vocabulary.
 */
export type StageStatus = 'failed' | 'running' | 'pending' | 'manual' | 'skipped' | 'canceled' | 'success';

/**
 * Discriminated union for pipeline failure pattern analysis.
 *
 * Variants:
 * - `no_failures`: zero failed jobs in the pipeline.
 * - `single`: exactly one failed job. `reason` is `null` when GitLab returned no
 *   `failure_reason` (or an empty string). `job_id` lets the caller fetch the log.
 * - `shared_reason`: N≥2 failed jobs that all carry the same `failure_reason`.
 *   `count` is the number of jobs carrying the reason. `unreasoned_count` is the
 *   number of failed jobs with no `failure_reason` populated (≥0). When
 *   `unreasoned_count === 0` every failure matches the diagnosis; when > 0, some
 *   failures could not be characterized.
 * - `mixed`: N≥2 failed jobs with at least two distinct `failure_reason` values.
 *   `reasons` maps each reason to its count. `unreasoned_count` is the number of
 *   failed jobs whose `failure_reason` was missing/empty and could not be
 *   bucketed into `reasons` (≥0); `sum(reasons) + unreasoned_count` equals the
 *   total number of failed jobs.
 * - `unknown`: N≥2 failed jobs where every `failure_reason` is missing/empty.
 *   GitLab gave us nothing to characterize; `count` is the total failure count.
 */
export type FailurePattern =
  | { kind: 'no_failures' }
  | { kind: 'single'; reason: string | null; job_id: number }
  | { kind: 'shared_reason'; reason: string; count: number; unreasoned_count: number }
  | { kind: 'mixed'; reasons: Record<string, number>; unreasoned_count: number }
  | { kind: 'unknown'; count: number };

/**
 * Response type for get_pipeline_summary tool.
 */
export interface PipelineSummaryResponse {
  pipeline: GitLabPipeline;
  stages: Array<{
    name: string;
    status: StageStatus;
    jobs: Array<GitLabJob & { log_tail?: string }>;
  }>;
  truncated: boolean;
  summary: {
    total_jobs: number;
    passed: number;
    failed: number;
    skipped: number;
    manual: number;
    canceled: number;
    failure_pattern: FailurePattern;
    log_fetch_errors?: Array<{ job_id: number; error: string }>;
    /**
     * Present when `failed > max_failed_jobs_with_logs` and the helper
     * intentionally skipped fetching logs for the trailing failures (cap
     * default 5). `fetched` is how many had logs attached; `total_failed`
     * is the full failure count. Absence means no cap-skipping happened.
     */
    log_fetch_capped?: { fetched: number; total_failed: number };
  };
}

/**
 * Response type for get_job_log_smart tool.
 */
export interface JobLogSmartResponse {
  job_id: number;
  log: string;
  line_count: number;
  truncated: boolean;
  sections_found: string[];
  section_matched: boolean | null;
  error_lines_matched: number | null;
}

/**
 * GitLab API client for interacting with GitLab resources
 */
export class GitLabApi {
  private apiUrl: string;
  private token: string;

  constructor(config: GitLabApiConfig) {
    this.apiUrl = config.apiUrl;
    this.token = config.token;
  }

  /**
   * Forks a GitLab project to a specified namespace.
   *
   * @param projectId - The ID or URL-encoded path of the project to fork
   * @param namespace - Optional namespace to fork the project into
   * @returns A promise that resolves to the forked project details
   * @throws Will throw an error if the GitLab API request fails
   */
  async forkProject(
    projectId: string,
    namespace?: string
  ): Promise<GitLabFork> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/fork`;
    const queryParams = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';

    const response = await fetch(url + queryParams, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabForkSchema.parse(await response.json());
  }

  /**
   * Creates a new branch in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for creating the branch, including name and ref
   * @returns A promise that resolves to the created branch details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createBranch(
    projectId: string,
    options: z.infer<typeof CreateBranchOptionsSchema>
  ): Promise<GitLabReference> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/branches`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          branch: options.name,
          ref: options.ref
        })
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabReferenceSchema.parse(await response.json());
  }

  /**
   * Retrieves the default branch reference for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @returns A promise that resolves to the default branch reference
   * @throws Will throw an error if the GitLab API request fails
   */
  async getDefaultBranchRef(projectId: string): Promise<string> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}`,
      {
        headers: {
          "Authorization": `Bearer ${this.token}`
        }
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const project = GitLabRepositorySchema.parse(await response.json());
    return project.default_branch;
  }

  /**
   * Retrieves the contents of a file from a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param filePath - The path of the file within the project
   * @param ref - The name of the branch, tag, or commit
   * @returns A promise that resolves to the file contents
   * @throws Will throw an error if the GitLab API request fails
   */
  async getFileContents(
    projectId: string,
    filePath: string,
    ref: string
  ): Promise<GitLabContent> {
    const encodedPath = encodeURIComponent(filePath);
    const url = `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}?ref=${encodeURIComponent(ref)}`;

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const data = GitLabContentSchema.parse(await response.json());

    if (!Array.isArray(data) && data.content) {
      data.content = Buffer.from(data.content, 'base64').toString('utf8');
    }

    return data;
  }

  /**
   * Creates or updates a file in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param filePath - The path of the file within the project
   * @param content - The content of the file
   * @param commitMessage - The commit message for the change
   * @param branch - The branch to commit the change to
   * @param previousPath - Optional previous path if the file is being renamed
   * @returns A promise that resolves to the created or updated file details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createOrUpdateFile(
    projectId: string,
    filePath: string,
    content: string,
    commitMessage: string,
    branch: string,
    previousPath?: string
  ): Promise<GitLabCreateUpdateFileResponse> {
    const encodedPath = encodeURIComponent(filePath);
    const url = `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}`;

    const body = {
      branch,
      content,
      commit_message: commitMessage,
      ...(previousPath ? { previous_path: previousPath } : {})
    };

    // Check if file exists
    let method = "POST";
    try {
      await this.getFileContents(projectId, filePath, branch);
      method = "PUT";
    } catch (error) {
      // File doesn't exist, use POST
    }

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const responseData = await response.json() as Record<string, any>;
    return {
      file_path: filePath,
      branch: branch,
      commit_id: responseData.commit_id || responseData.id || "unknown",
      content: responseData.content
    };
  }

  /**
   * Creates a commit in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param message - The commit message
   * @param branch - The branch to commit the changes to
   * @param actions - An array of file operations to include in the commit
   * @returns A promise that resolves to the created commit details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createCommit(
    projectId: string,
    message: string,
    branch: string,
    actions: FileOperation[]
  ): Promise<GitLabCommit> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/commits`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          branch,
          commit_message: message,
          actions: actions.map(action => ({
            action: "create",
            file_path: action.path,
            content: action.content
          }))
        })
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabCommitSchema.parse(await response.json());
  }

  /**
   * Searches for GitLab projects based on a query.
   *
   * @param query - The search query
   * @param page - The page number to retrieve (default is 1)
   * @param perPage - The number of results per page (default is 20)
   * @returns A promise that resolves to the search results
   * @throws Will throw an error if the GitLab API request fails
   */
  async searchProjects(
    query: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<GitLabSearchResponse> {
    const url = new URL(`${this.apiUrl}/projects`);
    url.searchParams.append("search", query);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("per_page", perPage.toString());

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const projects = await response.json();
    return GitLabSearchResponseSchema.parse({
      count: parseInt(response.headers.get("X-Total") || "0"),
      items: projects
    });
  }

  /**
   * Lists all projects (repositories) within a specific GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the list of group projects
   * @throws Will throw an error if the GitLab API request fails
   */
  async listGroupProjects(
    groupId: string,
    options: {
      archived?: boolean;
      visibility?: 'public' | 'internal' | 'private';
      order_by?: 'id' | 'name' | 'path' | 'created_at' | 'updated_at' | 'last_activity_at';
      sort?: 'asc' | 'desc';
      search?: string;
      simple?: boolean;
      include_subgroups?: boolean;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabGroupProjectsResponse> {
    const url = new URL(`${this.apiUrl}/groups/${encodeURIComponent(groupId)}/projects`);

    // Add query parameters
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const projects = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabGroupProjectsResponseSchema.parse({
      count: totalCount,
      items: projects
    });
  }

  /**
   * Retrieves events for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the events response
   * @throws Will throw an error if the GitLab API request fails
   */
  async getProjectEvents(
    projectId: string,
    options: {
      action?: string;
      target_type?: string;
      before?: string;
      after?: string;
      sort?: "asc" | "desc";
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabEventsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/events`
    );

    // Add query parameters for filtering and pagination
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const events = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabEventsResponseSchema.parse({
      count: totalCount,
      items: events,
    });
  }

  /**
   * Retrieves commits for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the commits response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listCommits(
    projectId: string,
    options: {
      sha?: string;
      since?: string;
      until?: string;
      path?: string;
      all?: boolean;
      with_stats?: boolean;
      first_parent?: boolean;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabCommitsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(
        projectId
      )}/repository/commits`
    );

    // Add query parameters for filtering and pagination
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const commits = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabCommitsResponseSchema.parse({
      count: totalCount,
      items: commits,
    });
  }

  /**
   * Retrieves issues for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the issues response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listIssues(
    projectId: string,
    options: {
      iid?: number | string;
      state?: "opened" | "closed" | "all";
      labels?: string;
      milestone?: string;
      scope?: "created_by_me" | "assigned_to_me" | "all";
      author_id?: number;
      assignee_id?: number;
      search?: string;
      created_after?: string;
      created_before?: string;
      updated_after?: string;
      updated_before?: string;
      order_by?: string;
      sort?: "asc" | "desc";
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabIssuesResponse> {
    const { iid, ...apiOptions } = options;

    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues`
    );

    Object.entries(apiOptions).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    if (iid !== undefined) {
      url.searchParams.append('iids[]', iid.toString());
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const issues = await response.json() as any[];
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabIssuesResponseSchema.parse({
      count: totalCount,
      items: issues,
    });
  }

  /**
   * Retrieves merge requests for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the merge requests response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listMergeRequests(
    projectId: string,
    options: {
      state?: "opened" | "closed" | "locked" | "merged" | "all";
      order_by?: "created_at" | "updated_at";
      sort?: "asc" | "desc";
      milestone?: string;
      labels?: string;
      created_after?: string;
      created_before?: string;
      updated_after?: string;
      updated_before?: string;
      scope?: "created_by_me" | "assigned_to_me" | "all";
      author_id?: number;
      assignee_id?: number;
      search?: string;
      source_branch?: string;
      target_branch?: string;
      wip?: "yes" | "no";
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabMergeRequestsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(
        projectId
      )}/merge_requests`
    );

    // Add all query parameters
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const mergeRequests = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabMergeRequestsResponseSchema.parse({
      count: totalCount,
      items: mergeRequests,
    });
  }

  /**
   * Creates a new issue in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for creating the issue, including title, description, assignee IDs, milestone ID, and labels
   * @returns A promise that resolves to the created issue details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createIssue(
    projectId: string,
    options: z.infer<typeof CreateIssueOptionsSchema>
  ): Promise<GitLabIssue> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: options.title,
          description: options.description,
          assignee_ids: options.assignee_ids,
          milestone_id: options.milestone_id,
          labels: options.labels?.join(',')
        })
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabIssueSchema.parse(await response.json());
  }

  /**
   * Creates a new merge request in a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for creating the merge request, including title, description, source branch, target branch, allow collaboration, and draft status
   * @returns A promise that resolves to the created merge request details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createMergeRequest(
    projectId: string,
    options: z.infer<typeof CreateMergeRequestOptionsSchema>
  ): Promise<GitLabMergeRequest> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: options.title,
          description: options.description,
          source_branch: options.source_branch,
          target_branch: options.target_branch,
          allow_collaboration: options.allow_collaboration,
          draft: options.draft
        })
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const responseData = await response.json() as Record<string, any>;

    return {
      id: responseData.id,
      iid: responseData.iid,
      project_id: responseData.project_id,
      title: responseData.title,
      description: responseData.description || null,
      state: responseData.state,
      merged: responseData.merged,
      author: responseData.author,
      assignees: responseData.assignees || [],
      source_branch: responseData.source_branch,
      target_branch: responseData.target_branch,
      diff_refs: responseData.diff_refs || null,
      web_url: responseData.web_url,
      created_at: responseData.created_at,
      updated_at: responseData.updated_at,
      merged_at: responseData.merged_at,
      closed_at: responseData.closed_at,
      merge_commit_sha: responseData.merge_commit_sha
    };
  }

  /**
   * Creates a new repository in GitLab.
   *
   * @param options - Options for creating the repository, including name, description, visibility, and initialization with README
   * @returns A promise that resolves to the created repository details
   * @throws Will throw an error if the GitLab API request fails
   */
  async createRepository(
    options: z.infer<typeof CreateRepositoryOptionsSchema>
  ): Promise<GitLabRepository> {
    const response = await fetch(`${this.apiUrl}/projects`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: options.name,
        description: options.description,
        visibility: options.visibility,
        initialize_with_readme: options.initialize_with_readme
      })
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    return GitLabRepositorySchema.parse(await response.json());
  }

  /**
   * Lists all wiki pages for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Optional parameters for the request
   * @returns A promise that resolves to the wiki pages response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listProjectWikiPages(
    projectId: string,
    options: {
      with_content?: boolean;
    } = {}
  ): Promise<GitLabWikiPagesResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis`
    );

    // Add query parameters
    if (options.with_content) {
      url.searchParams.append("with_content", "true");
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const wikiPages = await response.json() as any[];

    // Validate and return the response
    return GitLabWikiPagesResponseSchema.parse({
      count: wikiPages.length,
      items: wikiPages,
    });
  }

  /**
   * Gets a specific wiki page for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param slug - The slug of the wiki page
   * @param options - Optional parameters for the request
   * @returns A promise that resolves to the wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async getProjectWikiPage(
    projectId: string,
    slug: string,
    options: {
      render_html?: boolean;
      version?: string;
    } = {}
  ): Promise<GitLabWikiPage> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis/${encodeURIComponent(slug)}`
    );

    // Add query parameters
    if (options.render_html) {
      url.searchParams.append("render_html", "true");
    }
    if (options.version) {
      url.searchParams.append("version", options.version);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Creates a new wiki page for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for creating the wiki page
   * @returns A promise that resolves to the created wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async createProjectWikiPage(
    projectId: string,
    options: {
      title: string;
      content: string;
      format?: WikiPageFormat;
    }
  ): Promise<GitLabWikiPage> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: options.title,
          content: options.content,
          format: options.format || "markdown",
        }),
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Edits an existing wiki page for a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param slug - The slug of the wiki page
   * @param options - Options for editing the wiki page
   * @returns A promise that resolves to the edited wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async editProjectWikiPage(
    projectId: string,
    slug: string,
    options: {
      title?: string;
      content?: string;
      format?: WikiPageFormat;
    }
  ): Promise<GitLabWikiPage> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis/${encodeURIComponent(slug)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: options.title,
          content: options.content,
          format: options.format,
        }),
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Deletes a wiki page from a GitLab project.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param slug - The slug of the wiki page
   * @returns A promise that resolves when the wiki page is deleted
   * @throws Will throw an error if the GitLab API request fails
   */
  async deleteProjectWikiPage(
    projectId: string,
    slug: string
  ): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis/${encodeURIComponent(slug)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }
  }

  /**
   * Uploads an attachment to a GitLab project wiki.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for uploading the attachment
   * @returns A promise that resolves to the uploaded attachment details
   * @throws Will throw an error if the GitLab API request fails
   */
  async uploadProjectWikiAttachment(
    projectId: string,
    options: {
      file_path: string;
      content: string;
      content_encoding?: 'utf8' | 'base64';
      branch?: string;
    }
  ): Promise<GitLabWikiAttachment> {
    const fileName = options.file_path.split('/').filter(Boolean).pop() || 'attachment';
    const bytes = options.content_encoding === 'base64'
      ? Buffer.from(options.content, 'base64')
      : options.content;
    const blob = new Blob([bytes], { type: 'application/octet-stream' });

    const formData = new FormData();
    formData.append('file', blob, fileName);
    if (options.branch) {
      formData.append('branch', options.branch);
    }

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis/attachments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const attachment = await response.json();
    return GitLabWikiAttachmentSchema.parse(attachment);
  }

  /**
   * Lists all wiki pages for a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Optional parameters for the request
   * @returns A promise that resolves to the wiki pages response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listGroupWikiPages(
    groupId: string,
    options: {
      with_content?: boolean;
    } = {}
  ): Promise<GitLabWikiPagesResponse> {
    const url = new URL(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis`
    );

    // Add query parameters
    if (options.with_content) {
      url.searchParams.append("with_content", "true");
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const wikiPages = await response.json() as any[];

    // Validate and return the response
    return GitLabWikiPagesResponseSchema.parse({
      count: wikiPages.length,
      items: wikiPages,
    });
  }

  /**
   * Gets a specific wiki page for a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param slug - The slug of the wiki page
   * @param options - Optional parameters for the request
   * @returns A promise that resolves to the wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async getGroupWikiPage(
    groupId: string,
    slug: string,
    options: {
      render_html?: boolean;
      version?: string;
    } = {}
  ): Promise<GitLabWikiPage> {
    const url = new URL(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis/${encodeURIComponent(slug)}`
    );

    // Add query parameters
    if (options.render_html) {
      url.searchParams.append("render_html", "true");
    }
    if (options.version) {
      url.searchParams.append("version", options.version);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Creates a new wiki page for a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Options for creating the wiki page
   * @returns A promise that resolves to the created wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async createGroupWikiPage(
    groupId: string,
    options: {
      title: string;
      content: string;
      format?: WikiPageFormat;
    }
  ): Promise<GitLabWikiPage> {
    const response = await fetch(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: options.title,
          content: options.content,
          format: options.format || "markdown",
        }),
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Edits an existing wiki page for a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param slug - The slug of the wiki page
   * @param options - Options for editing the wiki page
   * @returns A promise that resolves to the edited wiki page
   * @throws Will throw an error if the GitLab API request fails
   */
  async editGroupWikiPage(
    groupId: string,
    slug: string,
    options: {
      title?: string;
      content?: string;
      format?: WikiPageFormat;
    }
  ): Promise<GitLabWikiPage> {
    const response = await fetch(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis/${encodeURIComponent(slug)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: options.title,
          content: options.content,
          format: options.format,
        }),
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    // Parse the response JSON
    const wikiPage = await response.json();

    // Validate and return the response
    return GitLabWikiPageSchema.parse(wikiPage);
  }

  /**
   * Deletes a wiki page from a GitLab group.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param slug - The slug of the wiki page
   * @returns A promise that resolves when the wiki page is deleted
   * @throws Will throw an error if the GitLab API request fails
   */
  async deleteGroupWikiPage(
    groupId: string,
    slug: string
  ): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis/${encodeURIComponent(slug)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }
  }

  /**
   * Uploads an attachment to a GitLab group wiki.
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Options for uploading the attachment
   * @returns A promise that resolves to the uploaded attachment details
   * @throws Will throw an error if the GitLab API request fails
   */
  async uploadGroupWikiAttachment(
    groupId: string,
    options: {
      file_path: string;
      content: string;
      content_encoding?: 'utf8' | 'base64';
      branch?: string;
    }
  ): Promise<GitLabWikiAttachment> {
    const fileName = options.file_path.split('/').filter(Boolean).pop() || 'attachment';
    const bytes = options.content_encoding === 'base64'
      ? Buffer.from(options.content, 'base64')
      : options.content;
    const blob = new Blob([bytes], { type: 'application/octet-stream' });

    const formData = new FormData();
    formData.append('file', blob, fileName);
    if (options.branch) {
      formData.append('branch', options.branch);
    }

    const response = await fetch(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis/attachments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const attachment = await response.json();
    return GitLabWikiAttachmentSchema.parse(attachment);
  }

  /**
   * Lists members of a GitLab project (including inherited members).
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param options - Options for listing members
   * @returns A promise that resolves to the members response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listProjectMembers(
    projectId: string,
    options: {
      query?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabMembersResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/members/all`
    );

    // Add query parameters
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const data = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabMembersResponseSchema.parse({
      count: totalCount,
      items: data
    });
  }

  /**
   * Lists members of a GitLab group (including inherited members).
   *
   * @param groupId - The ID or URL-encoded path of the group
   * @param options - Options for listing members
   * @returns A promise that resolves to the members response
   * @throws Will throw an error if the GitLab API request fails
   */
  async listGroupMembers(
    groupId: string,
    options: {
      query?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabMembersResponse> {
    const url = new URL(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/members/all`
    );

    // Add query parameters
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API error: ${response.statusText}`
      );
    }

    const data = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabMembersResponseSchema.parse({
      count: totalCount,
      items: data
    });
  }

  /**
   * Retrieves notes for a GitLab issue.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param issueIid - The internal ID of the issue
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the notes response
   * @throws Will throw an error if the GitLab API request fails
   */
  async getIssueNotes(
    projectId: string,
    issueIid: number,
    options: {
      sort?: "asc" | "desc";
      order_by?: "created_at" | "updated_at";
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabNotesResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes`
    );

    // Add query parameters for filtering and pagination
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;
      
      if (response.status === 404) {
        errorMessage = `Issue not found: Project ID ${projectId}, Issue IID ${issueIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access issue notes`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        errorMessage
      );
    }

    // Parse the response JSON
    const notes = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabNotesResponseSchema.parse({
      count: totalCount,
      items: notes,
    });
  }

  /**
   * Retrieves discussions for a GitLab issue.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param issueIid - The internal ID of the issue
   * @param options - Optional parameters for pagination
   * @returns A promise that resolves to the discussions response
   * @throws Will throw an error if the GitLab API request fails
   */
  async getIssueDiscussions(
    projectId: string,
    issueIid: number,
    options: {
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabDiscussionsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/discussions`
    );

    // Add query parameters for pagination
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;
      
      if (response.status === 404) {
        errorMessage = `Issue not found: Project ID ${projectId}, Issue IID ${issueIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access issue discussions`;
      } else if (response.status === 429) {
        errorMessage = `GitLab API rate limit exceeded`;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        errorMessage
      );
    }

    // Parse the response JSON
    const discussions = await response.json();

    // Get the total count from the headers
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabDiscussionsResponseSchema.parse({
      count: totalCount,
      items: discussions,
    });
  }

  /**
   * Approves a merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @param sha - Optional SHA to ensure the MR hasn't changed
   * @returns A promise that resolves to the merge request details
   * @throws Will throw an error if the GitLab API request fails
   */
  async approveMergeRequest(
    projectId: string,
    mergeRequestIid: number,
    sha?: string
  ): Promise<MergeRequestApprovalState> {
    const body: Record<string, string> = {};
    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      }
    );

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 401) {
        errorMessage = `Unauthorized: You don't have permission to approve this merge request`;
      } else if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 409) {
        errorMessage = `SHA mismatch: The merge request has been updated since the SHA was provided`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    return MergeRequestApprovalStateSchema.parse(await response.json());
  }

  /**
   * Removes approval from a merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @returns A promise that resolves to the approval state object returned by GitLab
   * @throws Will throw an error if the GitLab API request fails
   */
  async unapproveMergeRequest(
    projectId: string,
    mergeRequestIid: number
  ): Promise<MergeRequestApprovalState> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/unapprove`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    // unapprove returns 204 No Content on success on CE; coerce to empty state object
    if (response.status === 204) {
      return {};
    }
    return MergeRequestApprovalStateSchema.parse(await response.json());
  }

  /**
   * Merges a merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @param options - Optional merge options
   * @returns A promise that resolves to the merge request details
   * @throws Will throw an error if the GitLab API request fails
   */
  async mergeMergeRequest(
    projectId: string,
    mergeRequestIid: number,
    options: {
      merge_commit_message?: string;
      squash_commit_message?: string;
      squash?: boolean;
      should_remove_source_branch?: boolean;
      sha?: string;
    } = {}
  ): Promise<GitLabMergeRequest> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/merge`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      }
    );

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 401) {
        errorMessage = `Unauthorized: You don't have permission to merge this merge request`;
      } else if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 405) {
        errorMessage = `Cannot merge: The merge request is in a state that cannot be merged (draft, closed, or pipeline pending)`;
      } else if (response.status === 406) {
        errorMessage = `Cannot merge: There are conflicts between source and target branches`;
      } else if (response.status === 409) {
        errorMessage = `SHA mismatch: The source branch has been updated since the SHA was provided`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    return GitLabMergeRequestSchema.parse(await response.json());
  }

  /**
   * Sets a merge request to merge when the pipeline succeeds (auto-merge).
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @param options - Optional merge options
   * @returns A promise that resolves to the merge request details
   * @throws Will throw an error if the GitLab API request fails
   */
  async setAutoMerge(
    projectId: string,
    mergeRequestIid: number,
    options: {
      merge_commit_message?: string;
      squash_commit_message?: string;
      squash?: boolean;
      should_remove_source_branch?: boolean;
      sha?: string;
    } = {}
  ): Promise<GitLabMergeRequest> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/merge`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...options,
          merge_when_pipeline_succeeds: true,
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 401) {
        errorMessage = `Unauthorized: You don't have permission to set auto-merge`;
      } else if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 405) {
        errorMessage = `Cannot set auto-merge: The merge request is in a state that cannot be merged`;
      } else if (response.status === 406) {
        errorMessage = `Cannot set auto-merge: There are conflicts between source and target branches`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    return GitLabMergeRequestSchema.parse(await response.json());
  }

  /**
   * Cancels auto-merge for a merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @returns A promise that resolves to the merge request details
   * @throws Will throw an error if the GitLab API request fails
   */
  async cancelAutoMerge(
    projectId: string,
    mergeRequestIid: number
  ): Promise<GitLabMergeRequest> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/cancel_merge_when_pipeline_succeeds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 406) {
        errorMessage = `Cannot cancel auto-merge: The merge request is not set to auto-merge`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    return GitLabMergeRequestSchema.parse(await response.json());
  }

  /**
   * Retrieves notes for a GitLab merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @param options - Optional parameters for filtering and pagination
   * @returns A promise that resolves to the notes response
   * @throws Will throw an error if the GitLab API request fails
   */
  async getMergeRequestNotes(
    projectId: string,
    mergeRequestIid: number,
    options: {
      sort?: "asc" | "desc";
      order_by?: "created_at" | "updated_at";
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabNotesResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/notes`
    );

    // Add query parameters for filtering and pagination
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access merge request notes`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    const notes = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabNotesResponseSchema.parse({
      count: totalCount,
      items: notes,
    });
  }

  /**
   * Creates a note on a GitLab merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @param body - The content of the note
   * @param internal - Whether the note is internal (optional)
   * @returns A promise that resolves to the created note
   * @throws Will throw an error if the GitLab API request fails
   */
  async createMergeRequestNote(
    projectId: string,
    mergeRequestIid: number,
    body: string,
    internal?: boolean
  ): Promise<GitLabNote> {
    const requestBody: Record<string, unknown> = { body };
    if (internal !== undefined) {
      requestBody.internal = internal;
    }

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/notes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to create note on merge request`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    return GitLabNoteSchema.parse(await response.json());
  }

  /**
   * Updates a note on a GitLab merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @param noteId - The ID of the note to update
   * @param body - The updated content of the note
   * @returns A promise that resolves to the updated note
   * @throws Will throw an error if the GitLab API request fails
   */
  async updateMergeRequestNote(
    projectId: string,
    mergeRequestIid: number,
    noteId: number,
    body: string
  ): Promise<GitLabNote> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/notes/${noteId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Note not found: Project ID ${projectId}, MR IID ${mergeRequestIid}, Note ID ${noteId}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to update note on merge request`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    return GitLabNoteSchema.parse(await response.json());
  }

  /**
   * Retrieves discussions for a GitLab merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @param options - Optional parameters for pagination
   * @returns A promise that resolves to the discussions response
   * @throws Will throw an error if the GitLab API request fails
   */
  async getMergeRequestDiscussions(
    projectId: string,
    mergeRequestIid: number,
    options: {
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabDiscussionsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/discussions`
    );

    // Add query parameters for pagination
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `GitLab API error: ${response.statusText}`;

      if (response.status === 404) {
        errorMessage = `Merge request not found: Project ID ${projectId}, MR IID ${mergeRequestIid}`;
      } else if (response.status === 403) {
        errorMessage = `Permission denied to access merge request discussions`;
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }

    const discussions = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabDiscussionsResponseSchema.parse({
      count: totalCount,
      items: discussions,
    });
  }

  // ===========================================================================
  // CI/CD: Pipelines
  // ===========================================================================

  async listPipelines(
    projectId: string,
    options: {
      status?: string;
      ref?: string;
      sha?: string;
      yaml_errors?: boolean;
      username?: string;
      updated_after?: string;
      updated_before?: string;
      order_by?: string;
      sort?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabPipelinesResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/pipelines`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const pipelines = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabPipelinesResponseSchema.parse({ count: totalCount, items: pipelines });
  }

  async getPipeline(projectId: string, pipelineId: number): Promise<GitLabPipeline> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabPipelineSchema.parse(await response.json());
  }

  async triggerPipeline(
    projectId: string,
    ref: string,
    variables?: Array<{ key: string; value: string; variable_type?: string }>
  ): Promise<GitLabPipeline> {
    const body: Record<string, unknown> = { ref };
    if (variables) {
      body.variables = variables;
    }

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/pipeline`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabPipelineSchema.parse(await response.json());
  }

  async retryPipeline(projectId: string, pipelineId: number): Promise<GitLabPipeline> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/retry`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabPipelineSchema.parse(await response.json());
  }

  async cancelPipeline(projectId: string, pipelineId: number): Promise<GitLabPipeline> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabPipelineSchema.parse(await response.json());
  }

  // ===========================================================================
  // CI/CD: Jobs
  // ===========================================================================

  async listPipelineJobs(
    projectId: string,
    pipelineId: number,
    options: {
      scope?: string[];
      include_retried?: boolean;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabJobsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/jobs`
    );
    if (options.scope) {
      options.scope.forEach(s => url.searchParams.append("scope[]", s));
    }
    if (options.include_retried !== undefined) {
      url.searchParams.append("include_retried", options.include_retried.toString());
    }
    if (options.page) url.searchParams.append("page", options.page.toString());
    if (options.per_page) url.searchParams.append("per_page", options.per_page.toString());

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const jobs = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabJobsResponseSchema.parse({ count: totalCount, items: jobs });
  }

  async getJob(projectId: string, jobId: number): Promise<GitLabJob> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/jobs/${jobId}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabJobSchema.parse(await response.json());
  }

  async getJobLog(projectId: string, jobId: number): Promise<string> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/trace`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return await response.text();
  }

  async retryJob(projectId: string, jobId: number): Promise<GitLabJob> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/retry`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabJobSchema.parse(await response.json());
  }

  async cancelJob(projectId: string, jobId: number): Promise<GitLabJob> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabJobSchema.parse(await response.json());
  }

  // ===========================================================================
  // CI/CD: Pipeline Investigation (composite tools)
  // ===========================================================================

  /** Strip ANSI escape codes from a log string. */
  private stripAnsi(log: string): string {
    // eslint-disable-next-line no-control-regex
    return log.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  }

  /**
   * Strip GitLab CI section markers from a log string.
   *
   * GitLab markers occupy their own line in the format
   *   `section_*:NNN:name\r\x1B[0K\n`
   * The regex tail `\r?(?:\x1B\[[0-9;]*[a-zA-Z])*\n?` consumes the optional
   * CR, any number of inline ANSI clear-control sequences (typically the
   * single `\x1B[0K` GitLab emits), and the trailing LF. This works whether
   * `stripAnsi` was called first (the `\x1B[NNN]` group matches zero times)
   * or NOT (the group consumes the orphan clear-control before the LF) -
   * so `get_job_log_smart` with `strip_ansi: false` no longer leaks
   * `\x1B[0K\n` fragments into the cleaned log.
   */
  private stripSections(log: string): string {
    // eslint-disable-next-line no-control-regex
    return log.replace(/section_(start|end):\d+:[^\r\n]*\r?(?:\x1B\[[0-9;]*[a-zA-Z])*\n?/g, '');
  }

  /** Strip ISO timestamp prefixes from log lines. */
  private stripTimestamps(log: string): string {
    return log.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/gm, '');
  }

  /**
   * Return the last `n` lines of `log`. A single trailing `\n` is treated
   * as the line terminator via the `endIdx` bound (NOT via a full
   * `log.slice(0, -1)` copy) so the memory footprint stays O(tail) instead
   * of the O(N) regression that allocating a normalized copy would cause.
   * Without the bound, `tail: 1` on `"ERROR\n"` returns `""` (codex R5).
   */
  private logTail(log: string, n: number): string {
    if (n <= 0 || log === '') return '';
    const endIdx = log.endsWith('\n') ? log.length - 1 : log.length;
    if (endIdx === 0) return '';
    let idx = endIdx;
    for (let i = 0; i < n; i++) {
      const nl = log.lastIndexOf('\n', idx - 1);
      if (nl < 0) return log.slice(0, endIdx);
      idx = nl;
    }
    return log.slice(idx + 1, endIdx);
  }

  /**
   * Return the first `n` lines of `log`. Mirrors `logTail`: trailing `\n`
   * is treated as terminator via `endIdx`, and the `nl >= endIdx` guard
   * keeps a stray `\n` at position `endIdx` from being consumed as a
   * meaningful line separator. O(head) memory via `indexOf`.
   */
  private logHead(log: string, n: number): string {
    if (n <= 0 || log === '') return '';
    const endIdx = log.endsWith('\n') ? log.length - 1 : log.length;
    if (endIdx === 0) return '';
    let idx = -1;
    for (let i = 0; i < n; i++) {
      const nl = log.indexOf('\n', idx + 1);
      if (nl < 0 || nl >= endIdx) return log.slice(0, endIdx);
      idx = nl;
    }
    return log.slice(0, idx);
  }

  /**
   * Count meaningful lines in `log` without allocating substrings.
   * A trailing `\n` is treated as the terminator of the last line, not as
   * the start of a new empty line - so `"ERROR\n"` reports 1 line, matching
   * the contract `logTail` returns. Empty string reports 0 (avoiding the
   * `''.split('\n').length === 1` JS quirk).
   */
  private countLines(log: string): number {
    if (log === '') return 0;
    // Start at 0 if the log ends with '\n' (the terminator absorbs the last
    // line slot); start at 1 otherwise (the unterminated content is one line).
    let count = log.endsWith('\n') ? 0 : 1;
    for (let i = 0; i < log.length; i++) {
      if (log.charCodeAt(i) === 10 /* \n */) count++;
    }
    return count;
  }

  /**
   * Clean a raw job log: strip ANSI codes, section markers, and timestamps.
   */
  private cleanLog(raw: string): string {
    return this.stripTimestamps(this.stripSections(this.stripAnsi(raw)));
  }

  /**
   * Analyze a set of failed jobs and return a discriminated FailurePattern.
   * `failure_reason` values that are null, undefined, or empty string are
   * treated as "unreasoned" - they do not contribute to the reason histogram
   * but their count is preserved via `unreasoned_count` on shared_reason or
   * the `unknown` variant.
   */
  private analyzeFailurePattern(failedJobs: GitLabJob[]): FailurePattern {
    if (failedJobs.length === 0) return { kind: 'no_failures' };

    if (failedJobs.length === 1) {
      // Normalize empty-string failure_reason to null so the contract reads as
      // "either we have a reason string, or we have no reason at all".
      return { kind: 'single', reason: failedJobs[0].failure_reason || null, job_id: failedJobs[0].id };
    }

    const reasons = failedJobs.map(j => j.failure_reason).filter(Boolean) as string[];
    const unreasonedCount = failedJobs.length - reasons.length;

    if (reasons.length === 0) {
      // N≥2 failed jobs where every failure_reason is missing/empty
      return { kind: 'unknown', count: failedJobs.length };
    }
    const uniqueReasons = [...new Set(reasons)];
    if (uniqueReasons.length === 1) {
      return {
        kind: 'shared_reason',
        reason: uniqueReasons[0],
        count: reasons.length,
        unreasoned_count: unreasonedCount,
      };
    }
    const counts: Record<string, number> = {};
    for (const r of reasons) counts[r] = (counts[r] || 0) + 1;
    return { kind: 'mixed', reasons: counts, unreasoned_count: unreasonedCount };
  }

  /**
   * Derive stage status from its jobs, mirroring GitLab's aggregation logic:
   * - `allow_failure: true` jobs that failed do NOT poison the stage to 'failed'
   * - mixed success+skipped+canceled+allow_failure-failed all collapse to 'success'
   * - The final safety branch is unreachable in practice when jobs are validated
   *   by `JobStatusEnum` (closed enum at src/schemas.ts). It exists as a
   *   schema-drift canary: if GitLab ever returns a new status value AND the
   *   schema is relaxed to accept it, the unrecognized mix is logged via
   *   `console.error` and the function conservatively returns 'success' rather
   *   than throwing.
   */
  private deriveStageStatus(jobs: GitLabJob[]): StageStatus {
    if (jobs.some(j => j.status === 'failed' && !j.allow_failure)) return 'failed';
    if (jobs.some(j => j.status === 'running')) return 'running';
    if (jobs.some(j => j.status === 'pending' || j.status === 'created')) return 'pending';
    if (jobs.some(j => j.status === 'manual')) return 'manual';
    if (jobs.every(j => j.status === 'skipped')) return 'skipped';
    if (jobs.every(j => j.status === 'canceled')) return 'canceled';
    // mixed success+skipped+canceled+allow_failure-failed all collapse to success
    if (jobs.every(j => j.status === 'success' || j.status === 'skipped' || j.status === 'canceled' || j.allow_failure)) {
      return 'success';
    }
    // Safety: log unrecognized status mix but conservatively return success
    console.error(`[deriveStageStatus] Unrecognized job status mix: ${[...new Set(jobs.map(j => j.status))].join(',')}`);
    return 'success';
  }

  /**
   * Fetch a pipeline summary with jobs grouped by stage and optional log tails
   * for failed jobs. Resolves pipeline from ref or pipeline_id.
   */
  async getPipelineSummary(
    projectId: string,
    options: {
      pipeline_id?: number;
      ref?: string;
      include_logs?: boolean;
      log_tail_lines?: number;
      max_failed_jobs_with_logs?: number;
    } = {}
  ): Promise<PipelineSummaryResponse> {
    // 1. Resolve pipeline. Use `!== undefined` so `pipeline_id: 0` is treated
    // as a real value (and rejected by schema's .int().positive() guard) rather
    // than silently falling through to "find latest pipeline".
    let pipeline: GitLabPipeline;
    if (options.pipeline_id !== undefined) {
      pipeline = await this.getPipeline(projectId, options.pipeline_id);
    } else {
      const listOpts: { ref?: string; per_page?: number } = { per_page: 1 };
      if (options.ref) listOpts.ref = options.ref;
      const result = await this.listPipelines(projectId, listOpts);
      if (result.items.length === 0) {
        throw new McpError(ErrorCode.InternalError, `No pipeline found${options.ref ? ` for ref '${options.ref}'` : ''}`);
      }
      pipeline = await this.getPipeline(projectId, result.items[0].id);
    }

    // 2. Fetch all jobs — paginate without relying on X-Total (may be absent in EE)
    const MAX_PAGES = 50;
    const allJobs: GitLabJob[] = [];
    let page = 1;
    let truncated = false;
    while (page <= MAX_PAGES) {
      const batch = await this.listPipelineJobs(projectId, pipeline.id, { per_page: 100, page });
      allJobs.push(...batch.items);
      if (batch.items.length < 100) break;
      page++;
    }
    if (page > MAX_PAGES) {
      truncated = true;
      console.error(`[get_pipeline_summary] Pagination cap reached (${MAX_PAGES} pages) for pipeline ${pipeline.id}`);
    }

    // 3. Group jobs by stage
    const stageOrder: string[] = [];
    const stageMap = new Map<string, Array<GitLabJob & { log_tail?: string }>>();
    for (const job of allJobs) {
      if (!stageMap.has(job.stage)) {
        stageOrder.push(job.stage);
        stageMap.set(job.stage, []);
      }
      stageMap.get(job.stage)!.push(job);
    }

    // 4. Fetch log tails for failed jobs (with error tracking + cap signal)
    const includeLogs = options.include_logs !== false;
    const logLines = Math.min(options.log_tail_lines ?? 50, 200);
    const maxLogsToFetch = Math.min(options.max_failed_jobs_with_logs ?? 5, 20);
    const logFetchErrors: Array<{ job_id: number; error: string }> = [];
    let logFetchCapped: { fetched: number; total_failed: number } | undefined;

    if (includeLogs) {
      const failedJobs = allJobs.filter(j => j.status === 'failed');
      const jobsToFetchLogs = failedJobs.slice(0, maxLogsToFetch);
      if (failedJobs.length > jobsToFetchLogs.length) {
        // Surface the cap-skip so callers don't silently see only the first N
        // log tails and assume that's the complete picture.
        logFetchCapped = { fetched: jobsToFetchLogs.length, total_failed: failedJobs.length };
      }

      await Promise.all(
        jobsToFetchLogs.map(async (job) => {
          try {
            const rawLog = await this.getJobLog(projectId, job.id);
            const tail = this.logTail(this.cleanLog(rawLog), logLines);
            const stageJobs = stageMap.get(job.stage);
            const target = stageJobs?.find(j => j.id === job.id);
            if (target) target.log_tail = tail;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logFetchErrors.push({ job_id: job.id, error: msg });
            console.error(`[get_pipeline_summary] Failed to fetch log for job ${job.id}: ${msg}`);
          }
        })
      );
    }

    // 5. Compute summary
    const failed = allJobs.filter(j => j.status === 'failed');
    const passed = allJobs.filter(j => j.status === 'success').length;
    const skipped = allJobs.filter(j => j.status === 'skipped').length;
    const manual = allJobs.filter(j => j.status === 'manual').length;
    const canceled = allJobs.filter(j => j.status === 'canceled').length;

    // 6. Build stage summaries
    const stages = stageOrder.map(stageName => {
      const jobs = stageMap.get(stageName)!;
      return { name: stageName, status: this.deriveStageStatus(jobs), jobs };
    });

    return {
      pipeline,
      stages,
      truncated,
      summary: {
        total_jobs: allJobs.length,
        passed,
        failed: failed.length,
        skipped,
        manual,
        canceled,
        failure_pattern: this.analyzeFailurePattern(failed),
        log_fetch_errors: logFetchErrors.length > 0 ? logFetchErrors : undefined,
        log_fetch_capped: logFetchCapped,
      }
    };
  }

  /**
   * Get a job's log with intelligent filtering — strip ANSI codes,
   * section markers, timestamps, and extract relevant portions.
   */
  async getJobLogSmart(
    projectId: string,
    jobId: number,
    options: {
      section?: string;
      tail?: number;
      head?: number;
      strip_ansi?: boolean;
      strip_timestamps?: boolean;
      error_only?: boolean;
    } = {}
  ): Promise<JobLogSmartResponse> {
    const rawLog = await this.getJobLog(projectId, jobId);

    const stripAnsi = options.strip_ansi !== false;
    const stripTimestamps = options.strip_timestamps !== false;

    // Extract sections from the raw log for discoverability, before any stripping.
    // The captured group contains the section name + any `[option=value]` collapsed
    // marker; we strip ANSI then drop everything from the first `[` so the surfaced
    // name matches the literal `section_end:NNN:NAME` token that callers can pass
    // back as the `section` argument. (End markers never carry options.)
    const sectionRegex = /section_start:\d+:([^\r\n]+)/g;
    const sectionsFound: string[] = [];
    let sectionMatch;
    while ((sectionMatch = sectionRegex.exec(rawLog)) !== null) {
      const sectionName = sectionMatch[1]
        // eslint-disable-next-line no-control-regex
        .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '') // strip ANSI escapes
        .replace(/\[.*$/, '')                  // strip collapsed/option suffix `[...]`
        .trim();
      if (sectionName && !sectionsFound.includes(sectionName)) {
        sectionsFound.push(sectionName);
      }
    }

    // Determine log content: extract specific section or use full log
    let log = rawLog;
    let sectionMatched: boolean | null = null;
    if (options.section) {
      sectionMatched = true;
      const escapedSection = options.section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // The `(?=[\\r\\n\\[]|$)` lookahead pins the section name to a delimiter
      // (CR, LF, `[option=...]`, or end-of-string) so that a request for
      // section `build` does NOT match an actual section named `build_extra`
      // by prefix - per GitLab's section marker grammar. Matching is
      // case-SENSITIVE: GitLab section names are identifiers and `Build` vs
      // `build` are distinct sections - the `i` flag would create ambiguity.
      const sectionStart = new RegExp(`section_start:\\d+:${escapedSection}(?=[\\r\\n\\[]|$)[^\\n]*\\n?`);
      // `g` flag enables `lastIndex`-based seeking so we don't have to slice
      // the (potentially multi-MB) rawLog before exec.
      const sectionEnd = new RegExp(`section_end:\\d+:${escapedSection}(?=[\\r\\n\\[]|$)`, 'g');
      const startMatch = sectionStart.exec(rawLog);
      if (startMatch) {
        const startIdx = startMatch.index + startMatch[0].length;
        sectionEnd.lastIndex = startIdx;
        const endMatch = sectionEnd.exec(rawLog);
        const endIdx = endMatch ? endMatch.index : rawLog.length;
        log = rawLog.slice(startIdx, endIdx);
      } else {
        sectionMatched = false;
        log = ''; // don't let filters run on raw log when section was requested but not found
      }
    }

    // Strip ANSI first if requested. Section markers are ALWAYS stripped:
    // they're noise regardless of strip_ansi, and leaving them in would
    // contaminate `tail`/`head` windows and inflate `line_count`. Section
    // stripping must follow ANSI stripping because the section-marker regex
    // expects the collapsed `\r\n` form (after the ANSI `\x1B[0K` is gone).
    if (stripAnsi) {
      log = this.stripAnsi(log);
    }
    log = this.stripSections(log);
    if (stripTimestamps) {
      log = this.stripTimestamps(log);
    }

    // Error-only extraction: regex-match whole lines containing any of the
    // error keywords. Avoids splitting the log into an array of all lines
    // when most are non-matching.
    let errorLinesMatched: number | null = null;
    if (options.error_only) {
      const errorLineRegex = /^.*(?:error|fatal|failed|exception|traceback|panic).*$/gim;
      const matches = log.match(errorLineRegex);
      errorLinesMatched = matches?.length ?? 0;
      log = matches?.join('\n') ?? '';
    }

    // Apply tail/head via index-based helpers - O(K) memory vs the O(N)
    // array-of-all-lines pattern. Compare against line counts in advance so
    // we only truncate when the limit actually shrinks the log.
    let truncated = false;
    if (options.tail !== undefined) {
      const total = this.countLines(log);
      if (options.tail < total) {
        log = this.logTail(log, options.tail);
        truncated = true;
      }
    } else if (options.head !== undefined) {
      const total = this.countLines(log);
      if (options.head < total) {
        log = this.logHead(log, options.head);
        truncated = true;
      }
    }

    // Drop the single trailing '\n' (if present) so the returned `log` field
    // has a stable shape regardless of which branches ran above. Without
    // this, tail/head truncation strips the terminator (logTail/logHead use
    // an `endIdx` bound) while the no-truncation passthrough preserves it -
    // an asymmetric contract where the same tool sometimes returns `"L\n"`
    // and sometimes `"L"` for what looks like the same content via line_count.
    if (log.endsWith('\n')) log = log.slice(0, -1);

    return {
      job_id: jobId,
      log,
      line_count: this.countLines(log),
      truncated,
      sections_found: sectionsFound,
      section_matched: sectionMatched,
      error_lines_matched: errorLinesMatched,
    };
  }

  /**
   * Fetch log tails for jobs (used by list_pipeline_jobs extension).
   * Returns results map and any errors encountered.
   */
  async getJobLogTails(
    projectId: string,
    jobIds: number[],
    logLines: number = 30
  ): Promise<{ tails: Map<number, string>; errors: Array<{ job_id: number; error: string }> }> {
    const tails = new Map<number, string>();
    const errors: Array<{ job_id: number; error: string }> = [];
    const cappedLines = Math.min(logLines, 200);

    await Promise.all(
      jobIds.map(async (jobId) => {
        try {
          const rawLog = await this.getJobLog(projectId, jobId);
          tails.set(jobId, this.logTail(this.cleanLog(rawLog), cappedLines));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push({ job_id: jobId, error: msg });
          console.error(`[getJobLogTails] Failed to fetch log for job ${jobId}: ${msg}`);
        }
      })
    );

    return { tails, errors };
  }

  // ===========================================================================
  // CI/CD: Environments
  // ===========================================================================

  async listEnvironments(
    projectId: string,
    options: {
      name?: string;
      search?: string;
      states?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabEnvironmentsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/environments`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const environments = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabEnvironmentsResponseSchema.parse({ count: totalCount, items: environments });
  }

  async getEnvironment(projectId: string, environmentId: number): Promise<GitLabEnvironment> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/environments/${environmentId}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabEnvironmentSchema.parse(await response.json());
  }

  // ===========================================================================
  // Repository: Branches
  // ===========================================================================

  async listBranches(
    projectId: string,
    options: {
      search?: string;
      regex?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabBranchesResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/branches`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const branches = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabBranchesResponseSchema.parse({ count: totalCount, items: branches });
  }

  async deleteBranch(projectId: string, branch: string): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/branches/${encodeURIComponent(branch)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }
  }

  async compareBranches(
    projectId: string,
    from: string,
    to: string,
    straight?: boolean
  ): Promise<GitLabCompareResult> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/compare`
    );
    url.searchParams.append("from", from);
    url.searchParams.append("to", to);
    if (straight !== undefined) {
      url.searchParams.append("straight", straight.toString());
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabCompareResultSchema.parse(await response.json());
  }

  // ===========================================================================
  // Repository: Tags
  // ===========================================================================

  async listTags(
    projectId: string,
    options: {
      search?: string;
      order_by?: string;
      sort?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabTagsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/tags`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const tags = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabTagsResponseSchema.parse({ count: totalCount, items: tags });
  }

  async createTag(
    projectId: string,
    tagName: string,
    ref: string,
    message?: string,
    releaseDescription?: string
  ): Promise<GitLabTag> {
    const body: Record<string, string> = { tag_name: tagName, ref };
    if (message) body.message = message;
    if (releaseDescription) body.release_description = releaseDescription;

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/tags`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabTagSchema.parse(await response.json());
  }

  // ===========================================================================
  // Repository: Tree
  // ===========================================================================

  async getRepositoryTree(
    projectId: string,
    options: {
      path?: string;
      ref?: string;
      recursive?: boolean;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabTreeResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/repository/tree`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const tree = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabTreeResponseSchema.parse({ count: totalCount, items: tree });
  }

  // ===========================================================================
  // Repository: Releases
  // ===========================================================================

  async listReleases(
    projectId: string,
    options: {
      order_by?: string;
      sort?: string;
      include_html_description?: boolean;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabReleasesResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/releases`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const releases = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabReleasesResponseSchema.parse({ count: totalCount, items: releases });
  }

  async createRelease(
    projectId: string,
    tagName: string,
    options: {
      name?: string;
      description?: string;
      ref?: string;
      milestones?: string[];
      released_at?: string;
    } = {}
  ): Promise<GitLabRelease> {
    const body: Record<string, unknown> = { tag_name: tagName, ...options };

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/releases`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabReleaseSchema.parse(await response.json());
  }

  // ===========================================================================
  // Issues: Update & Notes
  // ===========================================================================

  async updateIssue(
    projectId: string,
    issueIid: number,
    options: {
      title?: string;
      description?: string;
      assignee_ids?: number[];
      milestone_id?: number | null;
      labels?: string[];
      state_event?: string;
      due_date?: string | null;
      confidential?: boolean;
    }
  ): Promise<GitLabIssue> {
    const body: Record<string, unknown> = { ...options };
    if (options.labels) {
      body.labels = options.labels.join(',');
    }

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabIssueSchema.parse(await response.json());
  }

  async createIssueNote(
    projectId: string,
    issueIid: number,
    body: string,
    internal?: boolean
  ): Promise<GitLabNote> {
    const requestBody: Record<string, unknown> = { body };
    if (internal !== undefined) {
      requestBody.internal = internal;
    }

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabNoteSchema.parse(await response.json());
  }

  // ===========================================================================
  // Labels
  // ===========================================================================

  async listLabels(
    projectId: string,
    options: {
      search?: string;
      include_ancestor_groups?: boolean;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabLabelsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/labels`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const labels = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabLabelsResponseSchema.parse({ count: totalCount, items: labels });
  }

  async createLabel(
    projectId: string,
    name: string,
    color: string,
    description?: string,
    priority?: number
  ): Promise<GitLabLabel> {
    const body: Record<string, unknown> = { name, color };
    if (description) body.description = description;
    if (priority !== undefined) body.priority = priority;

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/labels`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabLabelSchema.parse(await response.json());
  }

  async updateLabel(
    projectId: string,
    labelId: number,
    options: {
      new_name?: string;
      color?: string;
      description?: string;
      priority?: number | null;
    }
  ): Promise<GitLabLabel> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/labels/${labelId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabLabelSchema.parse(await response.json());
  }

  // ===========================================================================
  // Milestones
  // ===========================================================================

  async listMilestones(
    projectId: string,
    options: {
      iids?: number[];
      state?: string;
      title?: string;
      search?: string;
      include_parent_milestones?: boolean;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabMilestonesResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/milestones`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'iids' && Array.isArray(value)) {
          value.forEach(v => url.searchParams.append("iids[]", v.toString()));
        } else {
          url.searchParams.append(key, value.toString());
        }
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const milestones = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabMilestonesResponseSchema.parse({ count: totalCount, items: milestones });
  }

  async createMilestone(
    projectId: string,
    title: string,
    options: {
      description?: string;
      due_date?: string;
      start_date?: string;
    } = {}
  ): Promise<GitLabMilestone> {
    const body: Record<string, unknown> = { title, ...options };

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/milestones`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabMilestoneSchema.parse(await response.json());
  }

  async updateMilestone(
    projectId: string,
    milestoneId: number,
    options: {
      title?: string;
      description?: string;
      due_date?: string | null;
      start_date?: string | null;
      state_event?: string;
    }
  ): Promise<GitLabMilestone> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/milestones/${milestoneId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabMilestoneSchema.parse(await response.json());
  }

  // ===========================================================================
  // MR Enhancements
  // ===========================================================================

  async getMergeRequestChanges(
    projectId: string,
    mergeRequestIid: number,
    accessRawDiffs?: boolean
  ): Promise<GitLabMergeRequestChanges> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/changes`
    );
    if (accessRawDiffs !== undefined) {
      url.searchParams.append("access_raw_diffs", accessRawDiffs.toString());
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabMergeRequestChangesSchema.parse(await response.json());
  }

  async getMergeRequestCommits(
    projectId: string,
    mergeRequestIid: number,
    options: { page?: number; per_page?: number } = {}
  ): Promise<GitLabCommitsResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/commits`
    );
    if (options.page) url.searchParams.append("page", options.page.toString());
    if (options.per_page) url.searchParams.append("per_page", options.per_page.toString());

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const commits = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabCommitsResponseSchema.parse({ count: totalCount, items: commits });
  }

  async updateMergeRequest(
    projectId: string,
    mergeRequestIid: number,
    options: {
      title?: string;
      description?: string;
      target_branch?: string;
      assignee_ids?: number[];
      reviewer_ids?: number[];
      labels?: string[];
      milestone_id?: number | null;
      state_event?: string;
      remove_source_branch?: boolean;
      squash?: boolean;
      draft?: boolean;
    }
  ): Promise<GitLabMergeRequest> {
    const body: Record<string, unknown> = { ...options };
    if (options.labels) {
      body.labels = options.labels.join(',');
    }

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabMergeRequestSchema.parse(await response.json());
  }

  async rebaseMergeRequest(
    projectId: string,
    mergeRequestIid: number,
    skipCi?: boolean
  ): Promise<{ rebase_in_progress: boolean }> {
    const body: Record<string, unknown> = {};
    if (skipCi !== undefined) {
      body.skip_ci = skipCi;
    }

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/rebase`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return await response.json() as { rebase_in_progress: boolean };
  }

  async createMergeRequestDiscussion(
    projectId: string,
    mergeRequestIid: number,
    body: string,
    position?: {
      base_sha: string;
      start_sha: string;
      head_sha: string;
      position_type: string;
      old_path?: string;
      new_path?: string;
      old_line?: number | null;
      new_line?: number | null;
    }
  ): Promise<GitLabDiscussion> {
    const requestBody: Record<string, unknown> = { body };
    if (position) {
      requestBody.position = position;
    }

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/discussions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabDiscussionSchema.parse(await response.json());
  }

  // ===========================================================================
  // Protected Branches
  // ===========================================================================

  async listProtectedBranches(
    projectId: string,
    options: {
      search?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabProtectedBranchesResponse> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/protected_branches`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const branches = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabProtectedBranchesResponseSchema.parse({ count: totalCount, items: branches });
  }

  async protectBranch(
    projectId: string,
    name: string,
    options: {
      push_access_level?: number;
      merge_access_level?: number;
      allow_force_push?: boolean;
      code_owner_approval_required?: boolean;
    } = {}
  ): Promise<GitLabProtectedBranch> {
    const body: Record<string, unknown> = { name, ...options };

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/protected_branches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabProtectedBranchSchema.parse(await response.json());
  }

  async unprotectBranch(projectId: string, name: string): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/protected_branches/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }
  }

  // ===========================================================================
  // Projects
  // ===========================================================================

  async getProject(
    projectId: string,
    options: {
      statistics?: boolean;
      license?: boolean;
      with_custom_attributes?: boolean;
    } = {}
  ): Promise<GitLabProjectDetail> {
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabProjectDetailSchema.parse(await response.json());
  }

  async updateProject(
    projectId: string,
    options: {
      name?: string;
      description?: string;
      default_branch?: string;
      visibility?: string;
      issues_enabled?: boolean;
      merge_requests_enabled?: boolean;
      wiki_enabled?: boolean;
      jobs_enabled?: boolean;
      archived?: boolean;
    }
  ): Promise<GitLabProjectDetail> {
    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabProjectDetailSchema.parse(await response.json());
  }

  // ===========================================================================
  // Users
  // ===========================================================================

  async getCurrentUser(): Promise<GitLabUserDetail> {
    const response = await fetch(
      `${this.apiUrl}/user`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabUserDetailSchema.parse(await response.json());
  }

  async listUsers(
    options: {
      username?: string;
      search?: string;
      active?: boolean;
      blocked?: boolean;
      external?: boolean;
      order_by?: string;
      sort?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabUsersResponse> {
    const url = new URL(`${this.apiUrl}/users`);
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const users = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabUsersResponseSchema.parse({ count: totalCount, items: users });
  }

  async getUser(userId: number): Promise<GitLabUserDetail> {
    const response = await fetch(
      `${this.apiUrl}/users/${userId}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabUserDetailSchema.parse(await response.json());
  }

  // ===========================================================================
  // Groups
  // ===========================================================================

  async listGroups(
    options: {
      search?: string;
      owned?: boolean;
      min_access_level?: number;
      top_level_only?: boolean;
      order_by?: string;
      sort?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabGroupsResponse> {
    const url = new URL(`${this.apiUrl}/groups`);
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const groups = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabGroupsResponseSchema.parse({ count: totalCount, items: groups });
  }

  async getGroup(
    groupId: string,
    options: {
      with_custom_attributes?: boolean;
      with_projects?: boolean;
    } = {}
  ): Promise<GitLabGroup> {
    const url = new URL(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabGroupSchema.parse(await response.json());
  }

  async listGroupSubgroups(
    groupId: string,
    options: {
      search?: string;
      owned?: boolean;
      min_access_level?: number;
      order_by?: string;
      sort?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<GitLabGroupsResponse> {
    const url = new URL(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/subgroups`
    );
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    const groups = await response.json();
    const totalCount = parseInt(response.headers.get("X-Total") || "0");

    return GitLabGroupsResponseSchema.parse({ count: totalCount, items: groups });
  }

  async createGroup(
    name: string,
    path: string,
    options: {
      description?: string;
      visibility?: string;
      parent_id?: number;
      project_creation_level?: string;
      subgroup_creation_level?: string;
    } = {}
  ): Promise<GitLabGroup> {
    const body: Record<string, unknown> = { name, path, ...options };

    const response = await fetch(
      `${this.apiUrl}/groups`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabGroupSchema.parse(await response.json());
  }

  async updateGroup(
    groupId: string,
    options: {
      name?: string;
      path?: string;
      description?: string;
      visibility?: string;
      project_creation_level?: string;
      subgroup_creation_level?: string;
    }
  ): Promise<GitLabGroup> {
    const response = await fetch(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }

    return GitLabGroupSchema.parse(await response.json());
  }

  async deleteGroup(groupId: string): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `GitLab API error: ${response.statusText}`);
    }
  }
}
