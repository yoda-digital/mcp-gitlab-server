import { z } from 'zod';
import fetch from "node-fetch";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
  GitLabForkSchema,
  GitLabReferenceSchema,
  GitLabRepositorySchema,
  GitLabIssueSchema,
  GitLabMergeRequestSchema,
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
    // Extract iid for client-side filtering if provided
    const { iid, ...apiOptions } = options;

    // Construct the URL with the project ID
    const url = new URL(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/issues`
    );

    // Add all query parameters except iid (we'll filter that client-side)
    Object.entries(apiOptions).forEach(([key, value]) => {
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
    const issues = await response.json() as any[];

    // If iid is provided, filter the issues by iid
    const filteredIssues = iid !== undefined
      ? issues.filter(issue => issue.iid?.toString() === iid.toString())
      : issues;

    // Get the total count - if filtered, use the filtered length
    const totalCount = iid !== undefined ? filteredIssues.length : parseInt(response.headers.get("X-Total") || "0");

    // Validate and return the response
    return GitLabIssuesResponseSchema.parse({
      count: totalCount,
      items: filteredIssues,
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
      branch?: string;
    }
  ): Promise<GitLabWikiAttachment> {
    // Convert content to base64 if it's not already
    const content = options.content.startsWith("data:")
      ? options.content
      : `data:application/octet-stream;base64,${Buffer.from(options.content).toString('base64')}`;

    const response = await fetch(
      `${this.apiUrl}/projects/${encodeURIComponent(projectId)}/wikis/attachments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_name: options.file_path.split('/').pop(),
          file_path: options.file_path,
          content: content,
          branch: options.branch,
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
    const attachment = await response.json();

    // Validate and return the response
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
      branch?: string;
    }
  ): Promise<GitLabWikiAttachment> {
    // Convert content to base64 if it's not already
    const content = options.content.startsWith("data:")
      ? options.content
      : `data:application/octet-stream;base64,${Buffer.from(options.content).toString('base64')}`;

    const response = await fetch(
      `${this.apiUrl}/groups/${encodeURIComponent(groupId)}/wikis/attachments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_name: options.file_path.split('/').pop(),
          file_path: options.file_path,
          content: content,
          branch: options.branch,
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
    const attachment = await response.json();

    // Validate and return the response
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
  ): Promise<GitLabMergeRequest> {
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

    return GitLabMergeRequestSchema.parse(await response.json());
  }

  /**
   * Removes approval from a merge request.
   *
   * @param projectId - The ID or URL-encoded path of the project
   * @param mergeRequestIid - The internal ID of the merge request
   * @returns A promise that resolves to the merge request details
   * @throws Will throw an error if the GitLab API request fails
   */
  async unapproveMergeRequest(
    projectId: string,
    mergeRequestIid: number
  ): Promise<GitLabMergeRequest> {
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

    return GitLabMergeRequestSchema.parse(await response.json());
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
