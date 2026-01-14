#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import packageJson from '../package.json' with { type: 'json' };
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListToolsResult,
  ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CreateOrUpdateFileSchema,
  SearchRepositoriesSchema,
  CreateRepositorySchema,
  GetFileContentsSchema,
  PushFilesSchema,
  CreateIssueSchema,
  CreateMergeRequestSchema,
  ForkRepositorySchema,
  CreateBranchSchema,
  ListGroupProjectsSchema,
  GetProjectEventsSchema,
  ListCommitsSchema,
  ListIssuesSchema,
  ListMergeRequestsSchema,
  ListProjectWikiPagesSchema,
  GetProjectWikiPageSchema,
  CreateProjectWikiPageSchema,
  EditProjectWikiPageSchema,
  DeleteProjectWikiPageSchema,
  UploadProjectWikiAttachmentSchema,
  ListGroupWikiPagesSchema,
  GetGroupWikiPageSchema,
  CreateGroupWikiPageSchema,
  EditGroupWikiPageSchema,
  DeleteGroupWikiPageSchema,
  UploadGroupWikiAttachmentSchema,
  ListProjectMembersSchema,
  ListGroupMembersSchema,
  FileOperationSchema,
  ListIssueNotesSchema,
  ListIssueDiscussionsSchema,
  ApproveMergeRequestSchema,
  UnapproveMergeRequestSchema,
  MergeMergeRequestSchema,
  SetAutoMergeSchema,
  CancelAutoMergeSchema,
  ListMergeRequestNotesSchema,
  CreateMergeRequestNoteSchema,
  UpdateMergeRequestNoteSchema,
  ListMergeRequestDiscussionsSchema,
  // CI/CD Schemas
  ListPipelinesSchema,
  GetPipelineSchema,
  TriggerPipelineSchema,
  RetryPipelineSchema,
  CancelPipelineSchema,
  ListPipelineJobsSchema,
  GetJobSchema,
  GetJobLogSchema,
  RetryJobSchema,
  CancelJobSchema,
  ListEnvironmentsSchema,
  GetEnvironmentSchema,
  // Repository Schemas
  ListBranchesSchema,
  DeleteBranchSchema,
  CompareBranchesSchema,
  ListTagsSchema,
  CreateTagSchema,
  GetRepositoryTreeSchema,
  ListReleasesSchema,
  CreateReleaseSchema,
  // Issue Enhancement Schemas
  UpdateIssueSchema,
  CreateIssueNoteSchema,
  // Label Schemas
  ListLabelsSchema,
  CreateLabelSchema,
  UpdateLabelSchema,
  // Milestone Schemas
  ListMilestonesSchema,
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  // MR Enhancement Schemas
  GetMergeRequestChangesSchema,
  GetMergeRequestCommitsSchema,
  UpdateMergeRequestSchema,
  RebaseMergeRequestSchema,
  CreateMergeRequestDiscussionSchema,
  // Protected Branch Schemas
  ListProtectedBranchesSchema,
  ProtectBranchSchema,
  UnprotectBranchSchema,
  // Project Schemas
  GetProjectSchema,
  UpdateProjectSchema,
  // User Schemas
  GetCurrentUserSchema,
  ListUsersSchema,
  GetUserSchema,
  // Group Schemas
  ListGroupsSchema,
  GetGroupSchema,
  ListGroupSubgroupsSchema,
  CreateGroupSchema,
  UpdateGroupSchema,
  DeleteGroupSchema,
} from './schemas.js';
import { GitLabApi } from './gitlab-api.js';
import { setupTransport } from './transport.js';
import {
  formatEventsResponse,
  formatCommitsResponse,
  formatIssuesResponse,
  formatMergeRequestsResponse,
  formatWikiPagesResponse,
  formatWikiPageResponse,
  formatWikiAttachmentResponse,
  formatMembersResponse,
  formatNotesResponse,
  formatDiscussionsResponse,
  formatPipelinesResponse,
  formatJobsResponse,
  formatEnvironmentsResponse,
  formatBranchesResponse,
  formatTagsResponse,
  formatTreeResponse,
  formatReleasesResponse,
  formatLabelsResponse,
  formatMilestonesResponse,
  formatProtectedBranchesResponse,
  formatUsersResponse,
  formatGroupsResponse
} from './formatters.js';
import { isValidISODate } from './utils.js';

// Configuration
const GITLAB_PERSONAL_ACCESS_TOKEN = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
const GITLAB_API_URL = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
const PORT = parseInt(process.env.PORT || '3000', 10);
const USE_SSE = process.env.USE_SSE === 'true';
const GITLAB_READ_ONLY_MODE = process.env.GITLAB_READ_ONLY_MODE === 'true';

if (!GITLAB_PERSONAL_ACCESS_TOKEN) {
  console.error("GITLAB_PERSONAL_ACCESS_TOKEN environment variable is not set");
  process.exit(1);
}

// Server capabilities
const serverCapabilities: ServerCapabilities = {
  tools: {}
};

// Create server
const server = new Server({
  name: "gitlab-mcp-server",
  version: packageJson.version,
}, {
  capabilities: serverCapabilities
});

// Create GitLab API client
const gitlabApi = new GitLabApi({
  apiUrl: GITLAB_API_URL,
  token: GITLAB_PERSONAL_ACCESS_TOKEN
});

// Helper function to convert Zod schema to JSON schema with proper type
function createJsonSchema(schema: z.ZodType<any>) {
  // Convert the schema using zodToJsonSchema
  const jsonSchema = zodToJsonSchema(schema);

  // Ensure we return an object with the expected structure
  return {
    type: "object" as const,
    properties: (jsonSchema as any).properties || {}
  };
}

// Define all available tools with their descriptions and schemas
const ALL_TOOLS = [
  {
    name: "create_or_update_file",
    description: "Create or update a single file in a GitLab project",
    inputSchema: createJsonSchema(CreateOrUpdateFileSchema),
    readOnly: false
  },
  {
    name: "search_repositories",
    description: "Search for GitLab projects",
    inputSchema: createJsonSchema(SearchRepositoriesSchema),
    readOnly: true
  },
  {
    name: "create_repository",
    description: "Create a new GitLab project",
    inputSchema: createJsonSchema(CreateRepositorySchema),
    readOnly: false
  },
  {
    name: "get_file_contents",
    description: "Get the contents of a file or directory from a GitLab project",
    inputSchema: createJsonSchema(GetFileContentsSchema),
    readOnly: true
  },
  {
    name: "push_files",
    description: "Push multiple files to a GitLab project in a single commit",
    inputSchema: createJsonSchema(PushFilesSchema),
    readOnly: false
  },
  {
    name: "create_issue",
    description: "Create a new issue in a GitLab project",
    inputSchema: createJsonSchema(CreateIssueSchema),
    readOnly: false
  },
  {
    name: "create_merge_request",
    description: "Create a new merge request in a GitLab project",
    inputSchema: createJsonSchema(CreateMergeRequestSchema),
    readOnly: false
  },
  {
    name: "fork_repository",
    description: "Fork a GitLab project to your account or specified namespace",
    inputSchema: createJsonSchema(ForkRepositorySchema),
    readOnly: false
  },
  {
    name: "create_branch",
    description: "Create a new branch in a GitLab project",
    inputSchema: createJsonSchema(CreateBranchSchema),
    readOnly: false
  },
  {
    name: "list_group_projects",
    description: "List all projects (repositories) within a specific GitLab group",
    inputSchema: createJsonSchema(ListGroupProjectsSchema),
    readOnly: true
  },
  {
    name: "get_project_events",
    description: "Get recent events/activities for a GitLab project",
    inputSchema: createJsonSchema(GetProjectEventsSchema),
    readOnly: true
  },
  {
    name: "list_commits",
    description: "Get commit history for a GitLab project",
    inputSchema: createJsonSchema(ListCommitsSchema),
    readOnly: true
  },
  {
    name: "list_issues",
    description: "Get issues for a GitLab project",
    inputSchema: createJsonSchema(ListIssuesSchema),
    readOnly: true
  },
  {
    name: "list_merge_requests",
    description: "Get merge requests for a GitLab project",
    inputSchema: createJsonSchema(ListMergeRequestsSchema),
    readOnly: true
  },
  // Project Wiki Tools
  {
    name: "list_project_wiki_pages",
    description: "List all wiki pages for a GitLab project",
    inputSchema: createJsonSchema(ListProjectWikiPagesSchema),
    readOnly: true
  },
  {
    name: "get_project_wiki_page",
    description: "Get a specific wiki page for a GitLab project",
    inputSchema: createJsonSchema(GetProjectWikiPageSchema),
    readOnly: true
  },
  {
    name: "create_project_wiki_page",
    description: "Create a new wiki page for a GitLab project",
    inputSchema: createJsonSchema(CreateProjectWikiPageSchema),
    readOnly: false
  },
  {
    name: "edit_project_wiki_page",
    description: "Edit an existing wiki page for a GitLab project",
    inputSchema: createJsonSchema(EditProjectWikiPageSchema),
    readOnly: false
  },
  {
    name: "delete_project_wiki_page",
    description: "Delete a wiki page from a GitLab project",
    inputSchema: createJsonSchema(DeleteProjectWikiPageSchema),
    readOnly: false
  },
  {
    name: "upload_project_wiki_attachment",
    description: "Upload an attachment to a GitLab project wiki",
    inputSchema: createJsonSchema(UploadProjectWikiAttachmentSchema),
    readOnly: false
  },
  // Group Wiki Tools
  {
    name: "list_group_wiki_pages",
    description: "List all wiki pages for a GitLab group",
    inputSchema: createJsonSchema(ListGroupWikiPagesSchema),
    readOnly: true
  },
  {
    name: "get_group_wiki_page",
    description: "Get a specific wiki page for a GitLab group",
    inputSchema: createJsonSchema(GetGroupWikiPageSchema),
    readOnly: true
  },
  {
    name: "create_group_wiki_page",
    description: "Create a new wiki page for a GitLab group",
    inputSchema: createJsonSchema(CreateGroupWikiPageSchema),
    readOnly: false
  },
  {
    name: "edit_group_wiki_page",
    description: "Edit an existing wiki page for a GitLab group",
    inputSchema: createJsonSchema(EditGroupWikiPageSchema),
    readOnly: false
  },
  {
    name: "delete_group_wiki_page",
    description: "Delete a wiki page from a GitLab group",
    inputSchema: createJsonSchema(DeleteGroupWikiPageSchema),
    readOnly: false
  },
  {
    name: "upload_group_wiki_attachment",
    description: "Upload an attachment to a GitLab group wiki",
    inputSchema: createJsonSchema(UploadGroupWikiAttachmentSchema),
    readOnly: false
  },
  // Member Tools
  {
    name: "list_project_members",
    description: "List all members of a GitLab project (including inherited members)",
    inputSchema: createJsonSchema(ListProjectMembersSchema),
    readOnly: true
  },
  {
    name: "list_group_members",
    description: "List all members of a GitLab group (including inherited members)",
    inputSchema: createJsonSchema(ListGroupMembersSchema),
    readOnly: true
  },
  // Issue Notes Tools
  {
    name: "list_issue_notes",
    description: "Fetch all comments and system notes for a GitLab issue",
    inputSchema: createJsonSchema(ListIssueNotesSchema),
    readOnly: true
  },
  {
    name: "list_issue_discussions",
    description: "Fetch all discussions (threaded comments) for a GitLab issue",
    inputSchema: createJsonSchema(ListIssueDiscussionsSchema),
    readOnly: true
  },
  // Merge Request Action Tools
  {
    name: "approve_merge_request",
    description: "Approve a merge request",
    inputSchema: createJsonSchema(ApproveMergeRequestSchema),
    readOnly: false
  },
  {
    name: "unapprove_merge_request",
    description: "Remove your approval from a merge request",
    inputSchema: createJsonSchema(UnapproveMergeRequestSchema),
    readOnly: false
  },
  {
    name: "merge_merge_request",
    description: "Merge a merge request",
    inputSchema: createJsonSchema(MergeMergeRequestSchema),
    readOnly: false
  },
  {
    name: "set_auto_merge",
    description: "Set a merge request to merge when pipeline succeeds (auto-merge)",
    inputSchema: createJsonSchema(SetAutoMergeSchema),
    readOnly: false
  },
  {
    name: "cancel_auto_merge",
    description: "Cancel auto-merge for a merge request",
    inputSchema: createJsonSchema(CancelAutoMergeSchema),
    readOnly: false
  },
  // Merge Request Notes Tools
  {
    name: "list_merge_request_notes",
    description: "List all comments and notes on a merge request",
    inputSchema: createJsonSchema(ListMergeRequestNotesSchema),
    readOnly: true
  },
  {
    name: "create_merge_request_note",
    description: "Add a comment to a merge request",
    inputSchema: createJsonSchema(CreateMergeRequestNoteSchema),
    readOnly: false
  },
  {
    name: "update_merge_request_note",
    description: "Edit a comment on a merge request",
    inputSchema: createJsonSchema(UpdateMergeRequestNoteSchema),
    readOnly: false
  },
  {
    name: "list_merge_request_discussions",
    description: "List all discussions (threaded comments) on a merge request",
    inputSchema: createJsonSchema(ListMergeRequestDiscussionsSchema),
    readOnly: true
  },
  // CI/CD: Pipelines
  {
    name: "list_pipelines",
    description: "List pipelines for a GitLab project",
    inputSchema: createJsonSchema(ListPipelinesSchema),
    readOnly: true
  },
  {
    name: "get_pipeline",
    description: "Get details of a specific pipeline",
    inputSchema: createJsonSchema(GetPipelineSchema),
    readOnly: true
  },
  {
    name: "trigger_pipeline",
    description: "Trigger a new pipeline for a branch or tag",
    inputSchema: createJsonSchema(TriggerPipelineSchema),
    readOnly: false
  },
  {
    name: "retry_pipeline",
    description: "Retry failed jobs in a pipeline",
    inputSchema: createJsonSchema(RetryPipelineSchema),
    readOnly: false
  },
  {
    name: "cancel_pipeline",
    description: "Cancel a running pipeline",
    inputSchema: createJsonSchema(CancelPipelineSchema),
    readOnly: false
  },
  // CI/CD: Jobs
  {
    name: "list_pipeline_jobs",
    description: "List jobs for a specific pipeline",
    inputSchema: createJsonSchema(ListPipelineJobsSchema),
    readOnly: true
  },
  {
    name: "get_job",
    description: "Get details of a specific job",
    inputSchema: createJsonSchema(GetJobSchema),
    readOnly: true
  },
  {
    name: "get_job_log",
    description: "Get the log/trace output of a job",
    inputSchema: createJsonSchema(GetJobLogSchema),
    readOnly: true
  },
  {
    name: "retry_job",
    description: "Retry a failed job",
    inputSchema: createJsonSchema(RetryJobSchema),
    readOnly: false
  },
  {
    name: "cancel_job",
    description: "Cancel a running job",
    inputSchema: createJsonSchema(CancelJobSchema),
    readOnly: false
  },
  // CI/CD: Environments
  {
    name: "list_environments",
    description: "List environments for a GitLab project",
    inputSchema: createJsonSchema(ListEnvironmentsSchema),
    readOnly: true
  },
  {
    name: "get_environment",
    description: "Get details of a specific environment",
    inputSchema: createJsonSchema(GetEnvironmentSchema),
    readOnly: true
  },
  // Repository: Branches
  {
    name: "list_branches",
    description: "List branches for a GitLab project",
    inputSchema: createJsonSchema(ListBranchesSchema),
    readOnly: true
  },
  {
    name: "delete_branch",
    description: "Delete a branch from a GitLab project",
    inputSchema: createJsonSchema(DeleteBranchSchema),
    readOnly: false
  },
  {
    name: "compare_branches",
    description: "Compare two branches, tags, or commits",
    inputSchema: createJsonSchema(CompareBranchesSchema),
    readOnly: true
  },
  // Repository: Tags
  {
    name: "list_tags",
    description: "List tags for a GitLab project",
    inputSchema: createJsonSchema(ListTagsSchema),
    readOnly: true
  },
  {
    name: "create_tag",
    description: "Create a new tag in a GitLab project",
    inputSchema: createJsonSchema(CreateTagSchema),
    readOnly: false
  },
  // Repository: Tree
  {
    name: "get_repository_tree",
    description: "Get the repository file tree",
    inputSchema: createJsonSchema(GetRepositoryTreeSchema),
    readOnly: true
  },
  // Repository: Releases
  {
    name: "list_releases",
    description: "List releases for a GitLab project",
    inputSchema: createJsonSchema(ListReleasesSchema),
    readOnly: true
  },
  {
    name: "create_release",
    description: "Create a new release for a GitLab project",
    inputSchema: createJsonSchema(CreateReleaseSchema),
    readOnly: false
  },
  // Issues: Update & Notes
  {
    name: "update_issue",
    description: "Update an existing issue",
    inputSchema: createJsonSchema(UpdateIssueSchema),
    readOnly: false
  },
  {
    name: "create_issue_note",
    description: "Add a comment to an issue",
    inputSchema: createJsonSchema(CreateIssueNoteSchema),
    readOnly: false
  },
  // Labels
  {
    name: "list_labels",
    description: "List labels for a GitLab project",
    inputSchema: createJsonSchema(ListLabelsSchema),
    readOnly: true
  },
  {
    name: "create_label",
    description: "Create a new label in a GitLab project",
    inputSchema: createJsonSchema(CreateLabelSchema),
    readOnly: false
  },
  {
    name: "update_label",
    description: "Update an existing label",
    inputSchema: createJsonSchema(UpdateLabelSchema),
    readOnly: false
  },
  // Milestones
  {
    name: "list_milestones",
    description: "List milestones for a GitLab project",
    inputSchema: createJsonSchema(ListMilestonesSchema),
    readOnly: true
  },
  {
    name: "create_milestone",
    description: "Create a new milestone in a GitLab project",
    inputSchema: createJsonSchema(CreateMilestoneSchema),
    readOnly: false
  },
  {
    name: "update_milestone",
    description: "Update an existing milestone",
    inputSchema: createJsonSchema(UpdateMilestoneSchema),
    readOnly: false
  },
  // MR Enhancements
  {
    name: "get_merge_request_changes",
    description: "Get the changes/diffs for a merge request",
    inputSchema: createJsonSchema(GetMergeRequestChangesSchema),
    readOnly: true
  },
  {
    name: "get_merge_request_commits",
    description: "Get the commits for a merge request",
    inputSchema: createJsonSchema(GetMergeRequestCommitsSchema),
    readOnly: true
  },
  {
    name: "update_merge_request",
    description: "Update an existing merge request",
    inputSchema: createJsonSchema(UpdateMergeRequestSchema),
    readOnly: false
  },
  {
    name: "rebase_merge_request",
    description: "Rebase a merge request onto the target branch",
    inputSchema: createJsonSchema(RebaseMergeRequestSchema),
    readOnly: false
  },
  {
    name: "create_merge_request_discussion",
    description: "Create a new discussion on a merge request",
    inputSchema: createJsonSchema(CreateMergeRequestDiscussionSchema),
    readOnly: false
  },
  // Protected Branches
  {
    name: "list_protected_branches",
    description: "List protected branches for a GitLab project",
    inputSchema: createJsonSchema(ListProtectedBranchesSchema),
    readOnly: true
  },
  {
    name: "protect_branch",
    description: "Protect a branch in a GitLab project",
    inputSchema: createJsonSchema(ProtectBranchSchema),
    readOnly: false
  },
  {
    name: "unprotect_branch",
    description: "Remove protection from a branch",
    inputSchema: createJsonSchema(UnprotectBranchSchema),
    readOnly: false
  },
  // Projects
  {
    name: "get_project",
    description: "Get details of a GitLab project",
    inputSchema: createJsonSchema(GetProjectSchema),
    readOnly: true
  },
  {
    name: "update_project",
    description: "Update a GitLab project's settings",
    inputSchema: createJsonSchema(UpdateProjectSchema),
    readOnly: false
  },
  // Users
  {
    name: "get_current_user",
    description: "Get details of the currently authenticated user",
    inputSchema: createJsonSchema(GetCurrentUserSchema),
    readOnly: true
  },
  {
    name: "list_users",
    description: "List GitLab users",
    inputSchema: createJsonSchema(ListUsersSchema),
    readOnly: true
  },
  {
    name: "get_user",
    description: "Get details of a specific user",
    inputSchema: createJsonSchema(GetUserSchema),
    readOnly: true
  },
  // Groups
  {
    name: "list_groups",
    description: "List GitLab groups",
    inputSchema: createJsonSchema(ListGroupsSchema),
    readOnly: true
  },
  {
    name: "get_group",
    description: "Get details of a specific group",
    inputSchema: createJsonSchema(GetGroupSchema),
    readOnly: true
  },
  {
    name: "list_group_subgroups",
    description: "List subgroups of a group",
    inputSchema: createJsonSchema(ListGroupSubgroupsSchema),
    readOnly: true
  },
  {
    name: "create_group",
    description: "Create a new GitLab group",
    inputSchema: createJsonSchema(CreateGroupSchema),
    readOnly: false
  },
  {
    name: "update_group",
    description: "Update a GitLab group's settings",
    inputSchema: createJsonSchema(UpdateGroupSchema),
    readOnly: false
  },
  {
    name: "delete_group",
    description: "Delete a GitLab group",
    inputSchema: createJsonSchema(DeleteGroupSchema),
    readOnly: false
  },
];

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
  if (GITLAB_READ_ONLY_MODE) {
    console.log("Server running in read-only mode, exposing only read operations");
    return {
      tools: ALL_TOOLS
        .filter(tool => tool.readOnly)
        .map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
    };
  }

  return {
    tools: ALL_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    // Check if tool is available in read-only mode
    if (GITLAB_READ_ONLY_MODE) {
      const tool = ALL_TOOLS.find(t => t.name === request.params.name);
      if (!tool || !tool.readOnly) {
        throw new Error(`Tool '${request.params.name}' is not available in read-only mode`);
      }
    }

    switch (request.params.name) {
      case "fork_repository": {
        const args = ForkRepositorySchema.parse(request.params.arguments);
        const fork = await gitlabApi.forkProject(args.project_id, args.namespace);
        return { content: [{ type: "text", text: JSON.stringify(fork, null, 2) }] };
      }

      case "create_branch": {
        const args = CreateBranchSchema.parse(request.params.arguments);
        let ref = args.ref;
        if (!ref) {
          ref = await gitlabApi.getDefaultBranchRef(args.project_id);
        }

        const branch = await gitlabApi.createBranch(args.project_id, {
          name: args.branch,
          ref
        });

        return { content: [{ type: "text", text: JSON.stringify(branch, null, 2) }] };
      }

      case "search_repositories": {
        const args = SearchRepositoriesSchema.parse(request.params.arguments);
        const results = await gitlabApi.searchProjects(args.search, args.page, args.per_page);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "create_repository": {
        const args = CreateRepositorySchema.parse(request.params.arguments);
        const repository = await gitlabApi.createRepository(args);
        return { content: [{ type: "text", text: JSON.stringify(repository, null, 2) }] };
      }

      case "get_file_contents": {
        const args = GetFileContentsSchema.parse(request.params.arguments);
        const contents = await gitlabApi.getFileContents(args.project_id, args.file_path, args.ref);
        return { content: [{ type: "text", text: JSON.stringify(contents, null, 2) }] };
      }

      case "create_or_update_file": {
        const args = CreateOrUpdateFileSchema.parse(request.params.arguments);
        const result = await gitlabApi.createOrUpdateFile(
          args.project_id,
          args.file_path,
          args.content,
          args.commit_message,
          args.branch,
          args.previous_path
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "push_files": {
        const args = PushFilesSchema.parse(request.params.arguments);

        // Use individual file creation for each file instead of batch commit
        const results = [];
        for (const file of args.files) {
          try {
            const result = await gitlabApi.createOrUpdateFile(
              args.project_id,
              file.path,
              file.content,
              args.commit_message,
              args.branch
            );
            results.push(result);
          } catch (error) {
            console.error(`Error creating/updating file ${file.path}:`, error);
            throw error;
          }
        }

        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "create_issue": {
        const args = CreateIssueSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const issue = await gitlabApi.createIssue(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
      }

      case "create_merge_request": {
        const args = CreateMergeRequestSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const mergeRequest = await gitlabApi.createMergeRequest(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "list_group_projects": {
        const args = ListGroupProjectsSchema.parse(request.params.arguments);
        const { group_id, ...options } = args;
        const results = await gitlabApi.listGroupProjects(group_id, options);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "get_project_events": {
        // Parse and validate the arguments
        const args = GetProjectEventsSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const events = await gitlabApi.getProjectEvents(project_id, options);

        // Format and return the response
        return formatEventsResponse(events);
      }

      case "list_commits": {
        // Parse and validate the arguments
        const args = ListCommitsSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Validate date formats if provided
        if (args.since && !isValidISODate(args.since)) {
          throw new Error(
            "since must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)"
          );
        }

        if (args.until && !isValidISODate(args.until)) {
          throw new Error(
            "until must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)"
          );
        }

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const commits = await gitlabApi.listCommits(project_id, options);

        // Format and return the response
        return formatCommitsResponse(commits);
      }

      case "list_issues": {
        // Parse and validate the arguments
        const args = ListIssuesSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Validate date formats if provided
        const dateFields = [
          "created_after",
          "created_before",
          "updated_after",
          "updated_before",
        ];
        dateFields.forEach((field) => {
          const value = args[field as keyof typeof args];
          if (
            typeof value === 'string' &&
            !isValidISODate(value)
          ) {
            throw new Error(
              `${field} must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)`
            );
          }
        });

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const issues = await gitlabApi.listIssues(project_id, options);

        // Format and return the response
        return formatIssuesResponse(issues);
      }

      case "list_merge_requests": {
        // Parse and validate the arguments
        const args = ListMergeRequestsSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Validate date formats if provided
        const dateFields = [
          "created_after",
          "created_before",
          "updated_after",
          "updated_before",
        ];
        dateFields.forEach((field) => {
          const value = args[field as keyof typeof args];
          if (
            typeof value === 'string' &&
            !isValidISODate(value)
          ) {
            throw new Error(
              `${field} must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SSZ)`
            );
          }
        });

        // Extract project_id and options
        const { project_id, ...options } = args;

        // Call the API function
        const mergeRequests = await gitlabApi.listMergeRequests(project_id, options);

        // Format and return the response
        return formatMergeRequestsResponse(mergeRequests);
      }

      // Project Wiki Tools
      case "list_project_wiki_pages": {
        const args = ListProjectWikiPagesSchema.parse(request.params.arguments);
        const wikiPages = await gitlabApi.listProjectWikiPages(args.project_id, {
          with_content: args.with_content
        });
        return formatWikiPagesResponse(wikiPages);
      }

      case "get_project_wiki_page": {
        const args = GetProjectWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.getProjectWikiPage(args.project_id, args.slug, {
          render_html: args.render_html,
          version: args.version
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "create_project_wiki_page": {
        const args = CreateProjectWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.createProjectWikiPage(args.project_id, {
          title: args.title,
          content: args.content,
          format: args.format
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "edit_project_wiki_page": {
        const args = EditProjectWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.editProjectWikiPage(args.project_id, args.slug, {
          title: args.title,
          content: args.content,
          format: args.format
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "delete_project_wiki_page": {
        const args = DeleteProjectWikiPageSchema.parse(request.params.arguments);
        await gitlabApi.deleteProjectWikiPage(args.project_id, args.slug);
        return { content: [{ type: "text", text: `Wiki page '${args.slug}' has been deleted.` }] };
      }

      case "upload_project_wiki_attachment": {
        const args = UploadProjectWikiAttachmentSchema.parse(request.params.arguments);
        const attachment = await gitlabApi.uploadProjectWikiAttachment(args.project_id, {
          file_path: args.file_path,
          content: args.content,
          branch: args.branch
        });
        return formatWikiAttachmentResponse(attachment);
      }

      // Group Wiki Tools
      case "list_group_wiki_pages": {
        const args = ListGroupWikiPagesSchema.parse(request.params.arguments);
        const wikiPages = await gitlabApi.listGroupWikiPages(args.group_id, {
          with_content: args.with_content
        });
        return formatWikiPagesResponse(wikiPages);
      }

      case "get_group_wiki_page": {
        const args = GetGroupWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.getGroupWikiPage(args.group_id, args.slug, {
          render_html: args.render_html,
          version: args.version
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "create_group_wiki_page": {
        const args = CreateGroupWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.createGroupWikiPage(args.group_id, {
          title: args.title,
          content: args.content,
          format: args.format
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "edit_group_wiki_page": {
        const args = EditGroupWikiPageSchema.parse(request.params.arguments);
        const wikiPage = await gitlabApi.editGroupWikiPage(args.group_id, args.slug, {
          title: args.title,
          content: args.content,
          format: args.format
        });
        return formatWikiPageResponse(wikiPage);
      }

      case "delete_group_wiki_page": {
        const args = DeleteGroupWikiPageSchema.parse(request.params.arguments);
        await gitlabApi.deleteGroupWikiPage(args.group_id, args.slug);
        return { content: [{ type: "text", text: `Wiki page '${args.slug}' has been deleted.` }] };
      }

      case "upload_group_wiki_attachment": {
        const args = UploadGroupWikiAttachmentSchema.parse(request.params.arguments);
        const attachment = await gitlabApi.uploadGroupWikiAttachment(args.group_id, {
          file_path: args.file_path,
          content: args.content,
          branch: args.branch
        });
        return formatWikiAttachmentResponse(attachment);
      }

      case "list_project_members": {
        const args = ListProjectMembersSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const members = await gitlabApi.listProjectMembers(project_id, options);
        return formatMembersResponse(members);
      }

      case "list_group_members": {
        const args = ListGroupMembersSchema.parse(request.params.arguments);
        const { group_id, ...options } = args;
        const members = await gitlabApi.listGroupMembers(group_id, options);
        return formatMembersResponse(members);
      }

      case "list_issue_notes": {
        // Parse and validate the arguments
        const args = ListIssueNotesSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Call the API function
        const notes = await gitlabApi.getIssueNotes(
          args.project_id,
          args.issue_iid,
          {
            sort: args.sort,
            order_by: args.order_by,
            page: args.page,
            per_page: args.per_page
          }
        );

        // Format and return the response
        return formatNotesResponse(notes);
      }

      case "list_issue_discussions": {
        // Parse and validate the arguments
        const args = ListIssueDiscussionsSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        // Call the API function
        const discussions = await gitlabApi.getIssueDiscussions(
          args.project_id,
          args.issue_iid,
          {
            page: args.page,
            per_page: args.per_page
          }
        );

        // Format and return the response
        return formatDiscussionsResponse(discussions);
      }

      // Merge Request Action Tools
      case "approve_merge_request": {
        const args = ApproveMergeRequestSchema.parse(request.params.arguments);
        const mergeRequest = await gitlabApi.approveMergeRequest(
          args.project_id,
          args.merge_request_iid,
          args.sha
        );
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "unapprove_merge_request": {
        const args = UnapproveMergeRequestSchema.parse(request.params.arguments);
        const mergeRequest = await gitlabApi.unapproveMergeRequest(
          args.project_id,
          args.merge_request_iid
        );
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "merge_merge_request": {
        const args = MergeMergeRequestSchema.parse(request.params.arguments);
        const { project_id, merge_request_iid, ...options } = args;
        const mergeRequest = await gitlabApi.mergeMergeRequest(
          project_id,
          merge_request_iid,
          options
        );
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "set_auto_merge": {
        const args = SetAutoMergeSchema.parse(request.params.arguments);
        const { project_id, merge_request_iid, ...options } = args;
        const mergeRequest = await gitlabApi.setAutoMerge(
          project_id,
          merge_request_iid,
          options
        );
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "cancel_auto_merge": {
        const args = CancelAutoMergeSchema.parse(request.params.arguments);
        const mergeRequest = await gitlabApi.cancelAutoMerge(
          args.project_id,
          args.merge_request_iid
        );
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      // Merge Request Notes Tools
      case "list_merge_request_notes": {
        const args = ListMergeRequestNotesSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const notes = await gitlabApi.getMergeRequestNotes(
          args.project_id,
          args.merge_request_iid,
          {
            sort: args.sort,
            order_by: args.order_by,
            page: args.page,
            per_page: args.per_page
          }
        );

        return formatNotesResponse(notes);
      }

      case "create_merge_request_note": {
        const args = CreateMergeRequestNoteSchema.parse(request.params.arguments);
        const note = await gitlabApi.createMergeRequestNote(
          args.project_id,
          args.merge_request_iid,
          args.body,
          args.internal
        );
        return { content: [{ type: "text", text: JSON.stringify(note, null, 2) }] };
      }

      case "update_merge_request_note": {
        const args = UpdateMergeRequestNoteSchema.parse(request.params.arguments);
        const note = await gitlabApi.updateMergeRequestNote(
          args.project_id,
          args.merge_request_iid,
          args.note_id,
          args.body
        );
        return { content: [{ type: "text", text: JSON.stringify(note, null, 2) }] };
      }

      case "list_merge_request_discussions": {
        const args = ListMergeRequestDiscussionsSchema.parse(request.params.arguments);

        // Additional validation for pagination parameters
        if (args.per_page && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const discussions = await gitlabApi.getMergeRequestDiscussions(
          args.project_id,
          args.merge_request_iid,
          {
            page: args.page,
            per_page: args.per_page
          }
        );

        return formatDiscussionsResponse(discussions);
      }

      // ===========================================================================
      // CI/CD: Pipelines
      // ===========================================================================

      case "list_pipelines": {
        const args = ListPipelinesSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { project_id, ...options } = args;
        const pipelines = await gitlabApi.listPipelines(project_id, options);
        return formatPipelinesResponse(pipelines);
      }

      case "get_pipeline": {
        const args = GetPipelineSchema.parse(request.params.arguments);
        const pipeline = await gitlabApi.getPipeline(args.project_id, args.pipeline_id);
        return { content: [{ type: "text", text: JSON.stringify(pipeline, null, 2) }] };
      }

      case "trigger_pipeline": {
        const args = TriggerPipelineSchema.parse(request.params.arguments);
        const pipeline = await gitlabApi.triggerPipeline(args.project_id, args.ref, args.variables);
        return { content: [{ type: "text", text: JSON.stringify(pipeline, null, 2) }] };
      }

      case "retry_pipeline": {
        const args = RetryPipelineSchema.parse(request.params.arguments);
        const pipeline = await gitlabApi.retryPipeline(args.project_id, args.pipeline_id);
        return { content: [{ type: "text", text: JSON.stringify(pipeline, null, 2) }] };
      }

      case "cancel_pipeline": {
        const args = CancelPipelineSchema.parse(request.params.arguments);
        const pipeline = await gitlabApi.cancelPipeline(args.project_id, args.pipeline_id);
        return { content: [{ type: "text", text: JSON.stringify(pipeline, null, 2) }] };
      }

      // ===========================================================================
      // CI/CD: Jobs
      // ===========================================================================

      case "list_pipeline_jobs": {
        const args = ListPipelineJobsSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const jobs = await gitlabApi.listPipelineJobs(args.project_id, args.pipeline_id, {
          scope: args.scope,
          include_retried: args.include_retried,
          page: args.page,
          per_page: args.per_page
        });
        return formatJobsResponse(jobs);
      }

      case "get_job": {
        const args = GetJobSchema.parse(request.params.arguments);
        const job = await gitlabApi.getJob(args.project_id, args.job_id);
        return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
      }

      case "get_job_log": {
        const args = GetJobLogSchema.parse(request.params.arguments);
        const log = await gitlabApi.getJobLog(args.project_id, args.job_id);
        return { content: [{ type: "text", text: log }] };
      }

      case "retry_job": {
        const args = RetryJobSchema.parse(request.params.arguments);
        const job = await gitlabApi.retryJob(args.project_id, args.job_id);
        return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
      }

      case "cancel_job": {
        const args = CancelJobSchema.parse(request.params.arguments);
        const job = await gitlabApi.cancelJob(args.project_id, args.job_id);
        return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
      }

      // ===========================================================================
      // CI/CD: Environments
      // ===========================================================================

      case "list_environments": {
        const args = ListEnvironmentsSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { project_id, ...options } = args;
        const environments = await gitlabApi.listEnvironments(project_id, options);
        return formatEnvironmentsResponse(environments);
      }

      case "get_environment": {
        const args = GetEnvironmentSchema.parse(request.params.arguments);
        const environment = await gitlabApi.getEnvironment(args.project_id, args.environment_id);
        return { content: [{ type: "text", text: JSON.stringify(environment, null, 2) }] };
      }

      // ===========================================================================
      // Repository: Branches
      // ===========================================================================

      case "list_branches": {
        const args = ListBranchesSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { project_id, ...options } = args;
        const branches = await gitlabApi.listBranches(project_id, options);
        return formatBranchesResponse(branches);
      }

      case "delete_branch": {
        const args = DeleteBranchSchema.parse(request.params.arguments);
        await gitlabApi.deleteBranch(args.project_id, args.branch);
        return { content: [{ type: "text", text: `Branch '${args.branch}' has been deleted.` }] };
      }

      case "compare_branches": {
        const args = CompareBranchesSchema.parse(request.params.arguments);
        const result = await gitlabApi.compareBranches(args.project_id, args.from, args.to, args.straight);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // ===========================================================================
      // Repository: Tags
      // ===========================================================================

      case "list_tags": {
        const args = ListTagsSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { project_id, ...options } = args;
        const tags = await gitlabApi.listTags(project_id, options);
        return formatTagsResponse(tags);
      }

      case "create_tag": {
        const args = CreateTagSchema.parse(request.params.arguments);
        const tag = await gitlabApi.createTag(
          args.project_id,
          args.tag_name,
          args.ref,
          args.message,
          args.release_description
        );
        return { content: [{ type: "text", text: JSON.stringify(tag, null, 2) }] };
      }

      // ===========================================================================
      // Repository: Tree
      // ===========================================================================

      case "get_repository_tree": {
        const args = GetRepositoryTreeSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { project_id, ...options } = args;
        const tree = await gitlabApi.getRepositoryTree(project_id, options);
        return formatTreeResponse(tree);
      }

      // ===========================================================================
      // Repository: Releases
      // ===========================================================================

      case "list_releases": {
        const args = ListReleasesSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { project_id, ...options } = args;
        const releases = await gitlabApi.listReleases(project_id, options);
        return formatReleasesResponse(releases);
      }

      case "create_release": {
        const args = CreateReleaseSchema.parse(request.params.arguments);
        const { project_id, tag_name, ...options } = args;
        const release = await gitlabApi.createRelease(project_id, tag_name, options);
        return { content: [{ type: "text", text: JSON.stringify(release, null, 2) }] };
      }

      // ===========================================================================
      // Issues: Update & Notes
      // ===========================================================================

      case "update_issue": {
        const args = UpdateIssueSchema.parse(request.params.arguments);
        const { project_id, issue_iid, ...options } = args;
        const issue = await gitlabApi.updateIssue(project_id, issue_iid, options);
        return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
      }

      case "create_issue_note": {
        const args = CreateIssueNoteSchema.parse(request.params.arguments);
        const note = await gitlabApi.createIssueNote(
          args.project_id,
          args.issue_iid,
          args.body,
          args.internal
        );
        return { content: [{ type: "text", text: JSON.stringify(note, null, 2) }] };
      }

      // ===========================================================================
      // Labels
      // ===========================================================================

      case "list_labels": {
        const args = ListLabelsSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { project_id, ...options } = args;
        const labels = await gitlabApi.listLabels(project_id, options);
        return formatLabelsResponse(labels);
      }

      case "create_label": {
        const args = CreateLabelSchema.parse(request.params.arguments);
        const label = await gitlabApi.createLabel(
          args.project_id,
          args.name,
          args.color,
          args.description,
          args.priority
        );
        return { content: [{ type: "text", text: JSON.stringify(label, null, 2) }] };
      }

      case "update_label": {
        const args = UpdateLabelSchema.parse(request.params.arguments);
        const { project_id, label_id, ...options } = args;
        const label = await gitlabApi.updateLabel(project_id, label_id, options);
        return { content: [{ type: "text", text: JSON.stringify(label, null, 2) }] };
      }

      // ===========================================================================
      // Milestones
      // ===========================================================================

      case "list_milestones": {
        const args = ListMilestonesSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { project_id, ...options } = args;
        const milestones = await gitlabApi.listMilestones(project_id, options);
        return formatMilestonesResponse(milestones);
      }

      case "create_milestone": {
        const args = CreateMilestoneSchema.parse(request.params.arguments);
        const { project_id, title, ...options } = args;
        const milestone = await gitlabApi.createMilestone(project_id, title, options);
        return { content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }] };
      }

      case "update_milestone": {
        const args = UpdateMilestoneSchema.parse(request.params.arguments);
        const { project_id, milestone_id, ...options } = args;
        const milestone = await gitlabApi.updateMilestone(project_id, milestone_id, options);
        return { content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }] };
      }

      // ===========================================================================
      // MR Enhancements
      // ===========================================================================

      case "get_merge_request_changes": {
        const args = GetMergeRequestChangesSchema.parse(request.params.arguments);
        const changes = await gitlabApi.getMergeRequestChanges(
          args.project_id,
          args.merge_request_iid,
          args.access_raw_diffs
        );
        return { content: [{ type: "text", text: JSON.stringify(changes, null, 2) }] };
      }

      case "get_merge_request_commits": {
        const args = GetMergeRequestCommitsSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const commits = await gitlabApi.getMergeRequestCommits(
          args.project_id,
          args.merge_request_iid,
          { page: args.page, per_page: args.per_page }
        );
        return formatCommitsResponse(commits);
      }

      case "update_merge_request": {
        const args = UpdateMergeRequestSchema.parse(request.params.arguments);
        const { project_id, merge_request_iid, ...options } = args;
        const mergeRequest = await gitlabApi.updateMergeRequest(project_id, merge_request_iid, options);
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "rebase_merge_request": {
        const args = RebaseMergeRequestSchema.parse(request.params.arguments);
        const result = await gitlabApi.rebaseMergeRequest(
          args.project_id,
          args.merge_request_iid,
          args.skip_ci
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "create_merge_request_discussion": {
        const args = CreateMergeRequestDiscussionSchema.parse(request.params.arguments);
        const discussion = await gitlabApi.createMergeRequestDiscussion(
          args.project_id,
          args.merge_request_iid,
          args.body,
          args.position
        );
        return { content: [{ type: "text", text: JSON.stringify(discussion, null, 2) }] };
      }

      // ===========================================================================
      // Protected Branches
      // ===========================================================================

      case "list_protected_branches": {
        const args = ListProtectedBranchesSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { project_id, ...options } = args;
        const branches = await gitlabApi.listProtectedBranches(project_id, options);
        return formatProtectedBranchesResponse(branches);
      }

      case "protect_branch": {
        const args = ProtectBranchSchema.parse(request.params.arguments);
        const { project_id, name, ...options } = args;
        const branch = await gitlabApi.protectBranch(project_id, name, options);
        return { content: [{ type: "text", text: JSON.stringify(branch, null, 2) }] };
      }

      case "unprotect_branch": {
        const args = UnprotectBranchSchema.parse(request.params.arguments);
        await gitlabApi.unprotectBranch(args.project_id, args.name);
        return { content: [{ type: "text", text: `Branch '${args.name}' is no longer protected.` }] };
      }

      // ===========================================================================
      // Projects
      // ===========================================================================

      case "get_project": {
        const args = GetProjectSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const project = await gitlabApi.getProject(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(project, null, 2) }] };
      }

      case "update_project": {
        const args = UpdateProjectSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const project = await gitlabApi.updateProject(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(project, null, 2) }] };
      }

      // ===========================================================================
      // Users
      // ===========================================================================

      case "get_current_user": {
        const user = await gitlabApi.getCurrentUser();
        return { content: [{ type: "text", text: JSON.stringify(user, null, 2) }] };
      }

      case "list_users": {
        const args = ListUsersSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const users = await gitlabApi.listUsers(args);
        return formatUsersResponse(users);
      }

      case "get_user": {
        const args = GetUserSchema.parse(request.params.arguments);
        const user = await gitlabApi.getUser(args.user_id);
        return { content: [{ type: "text", text: JSON.stringify(user, null, 2) }] };
      }

      // ===========================================================================
      // Groups
      // ===========================================================================

      case "list_groups": {
        const args = ListGroupsSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const groups = await gitlabApi.listGroups(args);
        return formatGroupsResponse(groups);
      }

      case "get_group": {
        const args = GetGroupSchema.parse(request.params.arguments);
        const { group_id, ...options } = args;
        const group = await gitlabApi.getGroup(group_id, options);
        return { content: [{ type: "text", text: JSON.stringify(group, null, 2) }] };
      }

      case "list_group_subgroups": {
        const args = ListGroupSubgroupsSchema.parse(request.params.arguments);

        if (args.per_page !== undefined && (args.per_page < 1 || args.per_page > 100)) {
          throw new Error("per_page must be between 1 and 100");
        }

        if (args.page !== undefined && args.page < 1) {
          throw new Error("page must be greater than 0");
        }

        const { group_id, ...options } = args;
        const subgroups = await gitlabApi.listGroupSubgroups(group_id, options);
        return formatGroupsResponse(subgroups);
      }

      case "create_group": {
        const args = CreateGroupSchema.parse(request.params.arguments);
        const { name, path, ...options } = args;
        const group = await gitlabApi.createGroup(name, path, options);
        return { content: [{ type: "text", text: JSON.stringify(group, null, 2) }] };
      }

      case "update_group": {
        const args = UpdateGroupSchema.parse(request.params.arguments);
        const { group_id, ...options } = args;
        const group = await gitlabApi.updateGroup(group_id, options);
        return { content: [{ type: "text", text: JSON.stringify(group, null, 2) }] };
      }

      case "delete_group": {
        const args = DeleteGroupSchema.parse(request.params.arguments);
        await gitlabApi.deleteGroup(args.group_id);
        return { content: [{ type: "text", text: `Group '${args.group_id}' has been scheduled for deletion.` }] };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      throw new Error(errorMessage);
    }
    throw error;
  }
});

// Start the server
async function runServer() {
  try {
    await setupTransport(server, { port: PORT, useSSE: USE_SSE });
    console.error(`GitLab MCP Server running with ${USE_SSE ? 'SSE' : 'stdio'} transport`);
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

runServer();
