#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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
} from './formatters.js';
import { isValidISODate } from './utils.js';

// Configuration
const GITLAB_PERSONAL_ACCESS_TOKEN = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
const GITLAB_API_URL = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
const PORT = parseInt(process.env.PORT || '3000', 10);
const USE_SSE = process.env.USE_SSE === 'true';

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
  version: "0.1.0",
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

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
  return {
    tools: [
      {
        name: "create_or_update_file",
        description: "Create or update a single file in a GitLab project",
        inputSchema: createJsonSchema(CreateOrUpdateFileSchema)
      },
      {
        name: "search_repositories",
        description: "Search for GitLab projects",
        inputSchema: createJsonSchema(SearchRepositoriesSchema)
      },
      {
        name: "create_repository",
        description: "Create a new GitLab project",
        inputSchema: createJsonSchema(CreateRepositorySchema)
      },
      {
        name: "get_file_contents",
        description: "Get the contents of a file or directory from a GitLab project",
        inputSchema: createJsonSchema(GetFileContentsSchema)
      },
      {
        name: "push_files",
        description: "Push multiple files to a GitLab project in a single commit",
        inputSchema: createJsonSchema(PushFilesSchema)
      },
      {
        name: "create_issue",
        description: "Create a new issue in a GitLab project",
        inputSchema: createJsonSchema(CreateIssueSchema)
      },
      {
        name: "create_merge_request",
        description: "Create a new merge request in a GitLab project",
        inputSchema: createJsonSchema(CreateMergeRequestSchema)
      },
      {
        name: "fork_repository",
        description: "Fork a GitLab project to your account or specified namespace",
        inputSchema: createJsonSchema(ForkRepositorySchema)
      },
      {
        name: "create_branch",
        description: "Create a new branch in a GitLab project",
        inputSchema: createJsonSchema(CreateBranchSchema)
      },
      {
        name: "list_group_projects",
        description: "List all projects (repositories) within a specific GitLab group",
        inputSchema: createJsonSchema(ListGroupProjectsSchema)
      },
      {
        name: "get_project_events",
        description: "Get recent events/activities for a GitLab project",
        inputSchema: createJsonSchema(GetProjectEventsSchema)
      },
      {
        name: "list_commits",
        description: "Get commit history for a GitLab project",
        inputSchema: createJsonSchema(ListCommitsSchema)
      },
      {
        name: "list_issues",
        description: "Get issues for a GitLab project",
        inputSchema: createJsonSchema(ListIssuesSchema)
      },
      {
        name: "list_merge_requests",
        description: "Get merge requests for a GitLab project",
        inputSchema: createJsonSchema(ListMergeRequestsSchema)
      },
      // Project Wiki Tools
      {
        name: "list_project_wiki_pages",
        description: "List all wiki pages for a GitLab project",
        inputSchema: createJsonSchema(ListProjectWikiPagesSchema)
      },
      {
        name: "get_project_wiki_page",
        description: "Get a specific wiki page for a GitLab project",
        inputSchema: createJsonSchema(GetProjectWikiPageSchema)
      },
      {
        name: "create_project_wiki_page",
        description: "Create a new wiki page for a GitLab project",
        inputSchema: createJsonSchema(CreateProjectWikiPageSchema)
      },
      {
        name: "edit_project_wiki_page",
        description: "Edit an existing wiki page for a GitLab project",
        inputSchema: createJsonSchema(EditProjectWikiPageSchema)
      },
      {
        name: "delete_project_wiki_page",
        description: "Delete a wiki page from a GitLab project",
        inputSchema: createJsonSchema(DeleteProjectWikiPageSchema)
      },
      {
        name: "upload_project_wiki_attachment",
        description: "Upload an attachment to a GitLab project wiki",
        inputSchema: createJsonSchema(UploadProjectWikiAttachmentSchema)
      },
      // Group Wiki Tools
      {
        name: "list_group_wiki_pages",
        description: "List all wiki pages for a GitLab group",
        inputSchema: createJsonSchema(ListGroupWikiPagesSchema)
      },
      {
        name: "get_group_wiki_page",
        description: "Get a specific wiki page for a GitLab group",
        inputSchema: createJsonSchema(GetGroupWikiPageSchema)
      },
      {
        name: "create_group_wiki_page",
        description: "Create a new wiki page for a GitLab group",
        inputSchema: createJsonSchema(CreateGroupWikiPageSchema)
      },
      {
        name: "edit_group_wiki_page",
        description: "Edit an existing wiki page for a GitLab group",
        inputSchema: createJsonSchema(EditGroupWikiPageSchema)
      },
      {
        name: "delete_group_wiki_page",
        description: "Delete a wiki page from a GitLab group",
        inputSchema: createJsonSchema(DeleteGroupWikiPageSchema)
      },
      {
        name: "upload_group_wiki_attachment",
        description: "Upload an attachment to a GitLab group wiki",
        inputSchema: createJsonSchema(UploadGroupWikiAttachmentSchema)
      },
      // Member Tools
      {
        name: "list_project_members",
        description: "List all members of a GitLab project (including inherited members)",
        inputSchema: createJsonSchema(ListProjectMembersSchema)
      },
      {
        name: "list_group_members",
        description: "List all members of a GitLab group (including inherited members)",
        inputSchema: createJsonSchema(ListGroupMembersSchema)
      },
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
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
        return { content: [{ type: "text", text: JSON.stringify(members, null, 2) }] };
      }

      case "list_group_members": {
        const args = ListGroupMembersSchema.parse(request.params.arguments);
        const { group_id, ...options } = args;
        const members = await gitlabApi.listGroupMembers(group_id, options);
        return { content: [{ type: "text", text: JSON.stringify(members, null, 2) }] };
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
