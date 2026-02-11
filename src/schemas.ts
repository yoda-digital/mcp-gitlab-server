import { z } from 'zod';

// Wiki Page Format
export const WikiPageFormatEnum = z.enum(['markdown', 'rdoc', 'asciidoc', 'org']);
export type WikiPageFormat = z.infer<typeof WikiPageFormatEnum>;

// GitLab Note
export const GitLabNoteSchema = z.object({
  id: z.number(),
  body: z.string(),
  attachment: z.any().nullable(),
  author: z.lazy(() => GitLabUserSchema),
  created_at: z.string(),
  updated_at: z.string(),
  system: z.boolean(),
  noteable_id: z.number(),
  noteable_type: z.string(),
  noteable_iid: z.number().optional(),
  resolvable: z.boolean().optional(),
  confidential: z.boolean().optional(),
  internal: z.boolean().optional(),
  type: z.string().nullable().optional(), // For system notes, indicates the type of change
  url: z.string().optional(),
});

export type GitLabNote = z.infer<typeof GitLabNoteSchema>;

// GitLab Notes Response
export const GitLabNotesResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabNoteSchema),
});

export type GitLabNotesResponse = z.infer<typeof GitLabNotesResponseSchema>;

// GitLab Discussion
export const GitLabDiscussionSchema = z.object({
  id: z.string(),
  individual_note: z.boolean(),
  notes: z.array(GitLabNoteSchema),
});

export type GitLabDiscussion = z.infer<typeof GitLabDiscussionSchema>;

// GitLab Discussions Response
export const GitLabDiscussionsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabDiscussionSchema),
});

export type GitLabDiscussionsResponse = z.infer<typeof GitLabDiscussionsResponseSchema>;

// GitLab User
export const GitLabUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  avatar_url: z.string().optional(),
  web_url: z.string().optional()
});

export type GitLabUser = z.infer<typeof GitLabUserSchema>;

// GitLab Repository
export const GitLabRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  web_url: z.string(),
  default_branch: z.string(),
  visibility: z.enum(['private', 'internal', 'public']),
  ssh_url_to_repo: z.string(),
  http_url_to_repo: z.string(),
  readme_url: z.string().nullable().optional(),
  forks_count: z.number().optional(),
  star_count: z.number().optional(),
  created_at: z.string(),
  last_activity_at: z.string()
});

export type GitLabRepository = z.infer<typeof GitLabRepositorySchema>;

// GitLab Fork
export const GitLabForkSchema = GitLabRepositorySchema;
export type GitLabFork = z.infer<typeof GitLabForkSchema>;

// GitLab Reference (Branch/Tag)
export const GitLabReferenceSchema = z.object({
  name: z.string(),
  commit: z.object({
    id: z.string(),
    short_id: z.string(),
    title: z.string(),
    created_at: z.string(),
    parent_ids: z.array(z.string()).optional()
  }),
  merged: z.boolean().optional(),
  protected: z.boolean(),
  developers_can_push: z.boolean().optional(),
  developers_can_merge: z.boolean().optional(),
  can_push: z.boolean().optional(),
  default: z.boolean().optional(),
  web_url: z.string().optional()
});

export type GitLabReference = z.infer<typeof GitLabReferenceSchema>;

// GitLab Content
export const GitLabContentSchema = z.object({
  file_name: z.string(),
  file_path: z.string(),
  size: z.number(),
  encoding: z.string(),
  content: z.string(),
  content_sha256: z.string().optional(),
  ref: z.string(),
  blob_id: z.string(),
  commit_id: z.string(),
  last_commit_id: z.string().optional()
});

export type GitLabContent = z.infer<typeof GitLabContentSchema>;

// GitLab Create/Update File Response
export const GitLabCreateUpdateFileResponseSchema = z.object({
  file_path: z.string(),
  branch: z.string(),
  commit_id: z.string(),
  content: z.any().optional()
});

export type GitLabCreateUpdateFileResponse = z.infer<typeof GitLabCreateUpdateFileResponseSchema>;

// GitLab Search Response
export const GitLabSearchResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabRepositorySchema)
});

export type GitLabSearchResponse = z.infer<typeof GitLabSearchResponseSchema>;

// GitLab Group Projects Response
export const GitLabGroupProjectsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabRepositorySchema)
});

export type GitLabGroupProjectsResponse = z.infer<typeof GitLabGroupProjectsResponseSchema>;

// GitLab Tree
export const GitLabTreeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['tree', 'blob']),
  path: z.string(),
  mode: z.string()
});

export type GitLabTree = z.infer<typeof GitLabTreeSchema>;

// GitLab Commit
export const GitLabCommitSchema = z.object({
  id: z.string(),
  short_id: z.string(),
  title: z.string(),
  author_name: z.string(),
  author_email: z.string(),
  authored_date: z.string(),
  committer_name: z.string(),
  committer_email: z.string(),
  committed_date: z.string(),
  created_at: z.string(),
  message: z.string(),
  parent_ids: z.array(z.string()).optional(),
  web_url: z.string(),
  stats: z.object({
    additions: z.number(),
    deletions: z.number(),
    total: z.number()
  }).optional()
});

export type GitLabCommit = z.infer<typeof GitLabCommitSchema>;

// GitLab Commits Response
export const GitLabCommitsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabCommitSchema)
});

export type GitLabCommitsResponse = z.infer<typeof GitLabCommitsResponseSchema>;

// GitLab Issue
export const GitLabIssueSchema = z.object({
  id: z.number(),
  iid: z.number(),
  project_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  closed_by: GitLabUserSchema.nullable().optional(),
  labels: z.array(z.union([z.string(), z.object({ name: z.string() })])),
  milestone: z.object({
    id: z.number(),
    iid: z.number(),
    project_id: z.number(),
    title: z.string(),
    description: z.string().nullable(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    due_date: z.string().nullable(),
    start_date: z.string().nullable(),
    web_url: z.string()
  }).nullable().optional(),
  assignees: z.array(GitLabUserSchema),
  author: GitLabUserSchema,
  user_notes_count: z.number().optional(),
  upvotes: z.number().optional(),
  downvotes: z.number().optional(),
  due_date: z.string().nullable().optional(),
  confidential: z.boolean().optional(),
  web_url: z.string()
});

export type GitLabIssue = z.infer<typeof GitLabIssueSchema>;

// GitLab Issues Response
export const GitLabIssuesResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabIssueSchema)
});

export type GitLabIssuesResponse = z.infer<typeof GitLabIssuesResponseSchema>;

// GitLab Merge Request
export const GitLabMergeRequestSchema = z.object({
  id: z.number(),
  iid: z.number(),
  project_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.string(),
  merged: z.boolean().optional(),
  author: GitLabUserSchema,
  assignees: z.array(GitLabUserSchema),
  source_branch: z.string(),
  target_branch: z.string(),
  diff_refs: z.object({
    base_sha: z.string(),
    head_sha: z.string(),
    start_sha: z.string()
  }).nullable().optional(),
  web_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  merged_at: z.string().nullable().optional(),
  closed_at: z.string().nullable().optional(),
  merge_commit_sha: z.string().nullable().optional()
});

export type GitLabMergeRequest = z.infer<typeof GitLabMergeRequestSchema>;

// GitLab Merge Requests Response
export const GitLabMergeRequestsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabMergeRequestSchema)
});

export type GitLabMergeRequestsResponse = z.infer<typeof GitLabMergeRequestsResponseSchema>;

// GitLab Event
export const GitLabEventSchema = z.object({
  id: z.number(),
  project_id: z.number().optional(),
  action_name: z.string(),
  target_id: z.number().nullable().optional(),
  target_type: z.string().nullable().optional(),
  target_title: z.string().nullable().optional(),
  author: GitLabUserSchema,
  created_at: z.string(),
  note: z.object({
    id: z.number(),
    body: z.string(),
    attachment: z.any().nullable(),
    author: GitLabUserSchema,
    created_at: z.string(),
    updated_at: z.string(),
    system: z.boolean(),
    noteable_id: z.number(),
    noteable_type: z.string(),
    resolvable: z.boolean().optional(),
    confidential: z.boolean().optional(),
    url: z.string().optional()
  }).nullable().optional(),
  push_data: z.object({
    commit_count: z.number().optional(),
    action: z.string().optional(),
    ref: z.string().optional(),
    ref_type: z.string().optional(),
    commit_from: z.string().nullable().optional(),
    commit_to: z.string().nullable().optional(),
    commit_title: z.string().nullable().optional()
  }).nullable().optional()
});

export type GitLabEvent = z.infer<typeof GitLabEventSchema>;

// GitLab Events Response
export const GitLabEventsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabEventSchema)
});

export type GitLabEventsResponse = z.infer<typeof GitLabEventsResponseSchema>;

// GitLab Wiki Page
export const GitLabWikiPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  format: WikiPageFormatEnum.default('markdown'),
  content: z.string().optional(),
  encoding: z.string().optional(),
  web_url: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export type GitLabWikiPage = z.infer<typeof GitLabWikiPageSchema>;

// GitLab Wiki Pages Response
export const GitLabWikiPagesResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabWikiPageSchema)
});

export type GitLabWikiPagesResponse = z.infer<typeof GitLabWikiPagesResponseSchema>;

// GitLab Wiki Attachment
export const GitLabWikiAttachmentSchema = z.object({
  file_name: z.string(),
  file_path: z.string(),
  branch: z.string(),
  commit_id: z.string(),
  url: z.string().optional()
});

export type GitLabWikiAttachment = z.infer<typeof GitLabWikiAttachmentSchema>;

// File Operation
export const FileOperationSchema = z.object({
  path: z.string(),
  content: z.string()
});

export type FileOperation = z.infer<typeof FileOperationSchema>;

// Tool Input Schemas
export const CreateRepositoryOptionsSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  visibility: z.enum(['private', 'internal', 'public']).default('private'),
  initialize_with_readme: z.boolean().default(true)
});

export const CreateBranchOptionsSchema = z.object({
  name: z.string(),
  ref: z.string().optional()
});

export const CreateIssueOptionsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  assignee_ids: z.array(z.number()).optional(),
  milestone_id: z.number().optional(),
  labels: z.array(z.string()).optional()
});

export const CreateMergeRequestOptionsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  source_branch: z.string(),
  target_branch: z.string(),
  allow_collaboration: z.boolean().optional(),
  draft: z.boolean().optional()
});

// Tool Schemas
export const CreateOrUpdateFileSchema = z.object({
  project_id: z.string(),
  file_path: z.string(),
  content: z.string(),
  commit_message: z.string(),
  branch: z.string(),
  previous_path: z.string().optional()
});

export const SearchRepositoriesSchema = z.object({
  search: z.string(),
  page: z.number().optional(),
  per_page: z.number().optional()
});

export const CreateRepositorySchema = CreateRepositoryOptionsSchema;

export const GetFileContentsSchema = z.object({
  project_id: z.string(),
  file_path: z.string(),
  ref: z.string()
});

export const PushFilesSchema = z.object({
  project_id: z.string(),
  files: z.array(FileOperationSchema),
  commit_message: z.string(),
  branch: z.string()
});

export const CreateIssueSchema = z.object({
  project_id: z.string()
}).merge(CreateIssueOptionsSchema);

export const CreateMergeRequestSchema = z.object({
  project_id: z.string()
}).merge(CreateMergeRequestOptionsSchema);

export const ForkRepositorySchema = z.object({
  project_id: z.string(),
  namespace: z.string().optional()
});

export const CreateBranchSchema = z.object({
  project_id: z.string(),
  branch: z.string(),
  ref: z.string().optional()
});

export const ListGroupProjectsSchema = z.object({
  group_id: z.string(),
  archived: z.boolean().optional(),
  visibility: z.enum(['public', 'internal', 'private']).optional(),
  order_by: z.enum(['id', 'name', 'path', 'created_at', 'updated_at', 'last_activity_at']).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  simple: z.boolean().optional(),
  include_subgroups: z.boolean().optional(),
  page: z.number().optional(),
  per_page: z.number().optional()
});

export const GetProjectEventsSchema = z.object({
  project_id: z.string(),
  action: z.string().optional(),
  target_type: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  page: z.number().optional(),
  per_page: z.number().optional()
});

export const ListCommitsSchema = z.object({
  project_id: z.string(),
  sha: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  path: z.string().optional(),
  all: z.boolean().optional(),
  with_stats: z.boolean().optional(),
  first_parent: z.boolean().optional(),
  page: z.number().optional(),
  per_page: z.number().optional()
});

export const ListIssuesSchema = z.object({
  project_id: z.string(),
  iid: z.union([z.number(), z.string()]).optional(),
  state: z.enum(['opened', 'closed', 'all']).optional(),
  labels: z.string().optional(),
  milestone: z.string().optional(),
  scope: z.enum(['created_by_me', 'assigned_to_me', 'all']).optional(),
  author_id: z.number().optional(),
  assignee_id: z.number().optional(),
  search: z.string().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  updated_after: z.string().optional(),
  updated_before: z.string().optional(),
  order_by: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  page: z.number().optional(),
  per_page: z.number().optional()
});

export const ListMergeRequestsSchema = z.object({
  project_id: z.string(),
  state: z.enum(['opened', 'closed', 'locked', 'merged', 'all']).optional(),
  order_by: z.enum(['created_at', 'updated_at']).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  milestone: z.string().optional(),
  labels: z.string().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  updated_after: z.string().optional(),
  updated_before: z.string().optional(),
  scope: z.enum(['created_by_me', 'assigned_to_me', 'all']).optional(),
  author_id: z.number().optional(),
  assignee_id: z.number().optional(),
  search: z.string().optional(),
  source_branch: z.string().optional(),
  target_branch: z.string().optional(),
  wip: z.enum(['yes', 'no']).optional(),
  page: z.number().optional(),
  per_page: z.number().optional()
});

// Wiki Tool Input Schemas
export const ListProjectWikiPagesSchema = z.object({
  project_id: z.string(),
  with_content: z.boolean().optional()
});

export const GetProjectWikiPageSchema = z.object({
  project_id: z.string(),
  slug: z.string(),
  render_html: z.boolean().optional(),
  version: z.string().optional()
});

export const CreateProjectWikiPageSchema = z.object({
  project_id: z.string(),
  title: z.string(),
  content: z.string(),
  format: WikiPageFormatEnum.optional()
});

export const EditProjectWikiPageSchema = z.object({
  project_id: z.string(),
  slug: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  format: WikiPageFormatEnum.optional()
});

export const DeleteProjectWikiPageSchema = z.object({
  project_id: z.string(),
  slug: z.string()
});

export const UploadProjectWikiAttachmentSchema = z.object({
  project_id: z.string(),
  file_path: z.string(),
  content: z.string(),
  branch: z.string().optional()
});

export const ListGroupWikiPagesSchema = z.object({
  group_id: z.string(),
  with_content: z.boolean().optional()
});

export const GetGroupWikiPageSchema = z.object({
  group_id: z.string(),
  slug: z.string(),
  render_html: z.boolean().optional(),
  version: z.string().optional()
});

export const CreateGroupWikiPageSchema = z.object({
  group_id: z.string(),
  title: z.string(),
  content: z.string(),
  format: WikiPageFormatEnum.optional()
});

export const EditGroupWikiPageSchema = z.object({
  group_id: z.string(),
  slug: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  format: WikiPageFormatEnum.optional()
});

export const DeleteGroupWikiPageSchema = z.object({
  group_id: z.string(),
  slug: z.string()
});

export const UploadGroupWikiAttachmentSchema = z.object({
  group_id: z.string(),
  file_path: z.string(),
  content: z.string(),
  branch: z.string().optional()
});

export const ListProjectMembersSchema = z.object({
  project_id: z.string(),
  query: z.string().optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
});

export const ListGroupMembersSchema = z.object({
  group_id: z.string(),
  query: z.string().optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
});

export const GitLabMemberSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  state: z.string(),
  avatar_url: z.string().optional(),
  web_url: z.string(),
  access_level: z.number(),
  access_level_description: z.string().optional(),
  expires_at: z.string().nullable(),
});

export type GitLabMember = z.infer<typeof GitLabMemberSchema>;

// GitLab Member Response
export const GitLabMembersResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabMemberSchema)
});

export type GitLabMembersResponse = z.infer<typeof GitLabMembersResponseSchema>;

// Issue Notes Tool Input Schemas
export const ListIssueNotesSchema = z.object({
  project_id: z.string(),
  issue_iid: z.number(),
  sort: z.enum(["asc", "desc"]).optional(),
  order_by: z.enum(["created_at", "updated_at"]).optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
});

export const ListIssueDiscussionsSchema = z.object({
  project_id: z.string(),
  issue_iid: z.number(),
  page: z.number().optional(),
  per_page: z.number().optional(),
});

// Merge Request Action Schemas
export const ApproveMergeRequestSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  sha: z.string().optional().describe("HEAD SHA to ensure MR hasn't changed"),
});

export const UnapproveMergeRequestSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
});

export const MergeMergeRequestSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  merge_commit_message: z.string().optional().describe("Custom merge commit message"),
  squash_commit_message: z.string().optional().describe("Custom squash commit message"),
  squash: z.boolean().optional().describe("Squash commits into single commit"),
  should_remove_source_branch: z.boolean().optional().describe("Remove source branch after merge"),
  sha: z.string().optional().describe("HEAD SHA to ensure source branch hasn't changed"),
});

export const SetAutoMergeSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  merge_commit_message: z.string().optional().describe("Custom merge commit message"),
  squash_commit_message: z.string().optional().describe("Custom squash commit message"),
  squash: z.boolean().optional().describe("Squash commits into single commit"),
  should_remove_source_branch: z.boolean().optional().describe("Remove source branch after merge"),
  sha: z.string().optional().describe("HEAD SHA to ensure source branch hasn't changed"),
});

export const CancelAutoMergeSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
});

// Merge Request Notes/Comments Schemas
export const ListMergeRequestNotesSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  sort: z.enum(["asc", "desc"]).optional().describe("Sort order"),
  order_by: z.enum(["created_at", "updated_at"]).optional().describe("Order by field"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const CreateMergeRequestNoteSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  body: z.string().describe("Note content"),
  internal: z.boolean().optional().describe("Create as internal note"),
});

export const UpdateMergeRequestNoteSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  note_id: z.number().describe("Note ID to update"),
  body: z.string().describe("Updated note content"),
});

export const ListMergeRequestDiscussionsSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

// ============================================================================
// CI/CD Schemas
// ============================================================================

// Pipeline status enum
export const PipelineStatusEnum = z.enum([
  "created", "waiting_for_resource", "preparing", "pending", "running",
  "success", "failed", "canceled", "skipped", "manual", "scheduled"
]);

// GitLab Pipeline
export const GitLabPipelineSchema = z.object({
  id: z.number(),
  iid: z.number().optional(),
  project_id: z.number(),
  sha: z.string(),
  ref: z.string(),
  status: PipelineStatusEnum,
  source: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  web_url: z.string(),
  before_sha: z.string().optional(),
  tag: z.boolean().optional(),
  yaml_errors: z.string().nullable().optional(),
  user: GitLabUserSchema.optional(),
  started_at: z.string().nullable().optional(),
  finished_at: z.string().nullable().optional(),
  committed_at: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  queued_duration: z.number().nullable().optional(),
  coverage: z.string().nullable().optional(),
  detailed_status: z.object({
    icon: z.string(),
    text: z.string(),
    label: z.string(),
    group: z.string(),
    tooltip: z.string(),
    has_details: z.boolean(),
    details_path: z.string().optional(),
    illustration: z.any().nullable().optional(),
    favicon: z.string().optional()
  }).optional()
});

export type GitLabPipeline = z.infer<typeof GitLabPipelineSchema>;

// GitLab Pipelines Response
export const GitLabPipelinesResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabPipelineSchema)
});

export type GitLabPipelinesResponse = z.infer<typeof GitLabPipelinesResponseSchema>;

// Job status enum
export const JobStatusEnum = z.enum([
  "created", "pending", "running", "failed", "success",
  "canceled", "skipped", "manual"
]);

// GitLab Job
export const GitLabJobSchema = z.object({
  id: z.number(),
  status: JobStatusEnum,
  stage: z.string(),
  name: z.string(),
  ref: z.string(),
  tag: z.boolean(),
  coverage: z.number().nullable().optional(),
  allow_failure: z.boolean().optional(),
  created_at: z.string(),
  started_at: z.string().nullable().optional(),
  finished_at: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  queued_duration: z.number().nullable().optional(),
  user: GitLabUserSchema.optional(),
  commit: z.object({
    id: z.string(),
    short_id: z.string(),
    title: z.string(),
    created_at: z.string(),
    author_name: z.string(),
    author_email: z.string(),
    message: z.string().optional()
  }).optional(),
  pipeline: z.object({
    id: z.number(),
    project_id: z.number(),
    sha: z.string(),
    ref: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    web_url: z.string()
  }).optional(),
  web_url: z.string(),
  artifacts: z.array(z.any()).optional(),
  runner: z.object({
    id: z.number(),
    description: z.string(),
    active: z.boolean(),
    is_shared: z.boolean().optional(),
    name: z.string().optional()
  }).nullable().optional(),
  artifacts_expire_at: z.string().nullable().optional(),
  failure_reason: z.string().optional()
});

export type GitLabJob = z.infer<typeof GitLabJobSchema>;

// GitLab Jobs Response
export const GitLabJobsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabJobSchema)
});

export type GitLabJobsResponse = z.infer<typeof GitLabJobsResponseSchema>;

// GitLab Environment
export const GitLabEnvironmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().optional(),
  external_url: z.string().nullable().optional(),
  state: z.enum(["available", "stopped"]).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  tier: z.string().optional(),
  last_deployment: z.object({
    id: z.number(),
    iid: z.number(),
    ref: z.string(),
    sha: z.string(),
    created_at: z.string(),
    status: z.string(),
    user: GitLabUserSchema.optional(),
    deployable: z.any().nullable().optional()
  }).nullable().optional()
});

export type GitLabEnvironment = z.infer<typeof GitLabEnvironmentSchema>;

// GitLab Environments Response
export const GitLabEnvironmentsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabEnvironmentSchema)
});

export type GitLabEnvironmentsResponse = z.infer<typeof GitLabEnvironmentsResponseSchema>;

// Pipeline Tool Schemas
export const ListPipelinesSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  status: PipelineStatusEnum.optional().describe("Filter by pipeline status"),
  ref: z.string().optional().describe("Filter by branch or tag name"),
  sha: z.string().optional().describe("Filter by SHA"),
  yaml_errors: z.boolean().optional().describe("Filter pipelines with YAML errors"),
  username: z.string().optional().describe("Filter by username who triggered"),
  updated_after: z.string().optional().describe("Return pipelines updated after date"),
  updated_before: z.string().optional().describe("Return pipelines updated before date"),
  order_by: z.enum(["id", "status", "ref", "updated_at", "user_id"]).optional().describe("Order by field"),
  sort: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const GetPipelineSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  pipeline_id: z.number().describe("Pipeline ID"),
});

export const TriggerPipelineSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  ref: z.string().describe("Branch or tag name to run pipeline for"),
  variables: z.array(z.object({
    key: z.string(),
    value: z.string(),
    variable_type: z.enum(["env_var", "file"]).optional()
  })).optional().describe("Pipeline variables"),
});

export const RetryPipelineSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  pipeline_id: z.number().describe("Pipeline ID"),
});

export const CancelPipelineSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  pipeline_id: z.number().describe("Pipeline ID"),
});

// Job Tool Schemas
export const ListPipelineJobsSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  pipeline_id: z.number().describe("Pipeline ID"),
  scope: z.array(JobStatusEnum).optional().describe("Filter by job status"),
  include_retried: z.boolean().optional().describe("Include retried jobs"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const GetJobSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  job_id: z.number().describe("Job ID"),
});

export const GetJobLogSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  job_id: z.number().describe("Job ID"),
});

export const RetryJobSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  job_id: z.number().describe("Job ID"),
});

export const CancelJobSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  job_id: z.number().describe("Job ID"),
});

// Environment Tool Schemas
export const ListEnvironmentsSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  name: z.string().optional().describe("Filter by environment name"),
  search: z.string().optional().describe("Search environments by name"),
  states: z.enum(["available", "stopped"]).optional().describe("Filter by state"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const GetEnvironmentSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  environment_id: z.number().describe("Environment ID"),
});

// ============================================================================
// Repository Schemas (Branches, Tags, Tree, Releases)
// ============================================================================

// GitLab Branch (extended from reference)
export const GitLabBranchSchema = z.object({
  name: z.string(),
  commit: z.object({
    id: z.string(),
    short_id: z.string(),
    title: z.string(),
    created_at: z.string(),
    parent_ids: z.array(z.string()).optional(),
    message: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    authored_date: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committed_date: z.string().optional(),
    web_url: z.string().optional()
  }),
  merged: z.boolean().optional(),
  protected: z.boolean(),
  developers_can_push: z.boolean().optional(),
  developers_can_merge: z.boolean().optional(),
  can_push: z.boolean().optional(),
  default: z.boolean().optional(),
  web_url: z.string().optional()
});

export type GitLabBranch = z.infer<typeof GitLabBranchSchema>;

// GitLab Branches Response
export const GitLabBranchesResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabBranchSchema)
});

export type GitLabBranchesResponse = z.infer<typeof GitLabBranchesResponseSchema>;

// GitLab Tag
export const GitLabTagSchema = z.object({
  name: z.string(),
  message: z.string().nullable().optional(),
  target: z.string().optional(),
  commit: z.object({
    id: z.string(),
    short_id: z.string(),
    title: z.string(),
    created_at: z.string(),
    parent_ids: z.array(z.string()).optional(),
    message: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    authored_date: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committed_date: z.string().optional(),
    web_url: z.string().optional()
  }).optional(),
  release: z.object({
    tag_name: z.string(),
    description: z.string().nullable()
  }).nullable().optional(),
  protected: z.boolean().optional()
});

export type GitLabTag = z.infer<typeof GitLabTagSchema>;

// GitLab Tags Response
export const GitLabTagsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabTagSchema)
});

export type GitLabTagsResponse = z.infer<typeof GitLabTagsResponseSchema>;

// GitLab Compare Result
export const GitLabCompareResultSchema = z.object({
  commit: GitLabCommitSchema.nullable().optional(),
  commits: z.array(GitLabCommitSchema),
  diffs: z.array(z.object({
    old_path: z.string(),
    new_path: z.string(),
    a_mode: z.string().optional(),
    b_mode: z.string().optional(),
    new_file: z.boolean(),
    renamed_file: z.boolean(),
    deleted_file: z.boolean(),
    diff: z.string()
  })),
  compare_timeout: z.boolean().optional(),
  compare_same_ref: z.boolean().optional(),
  web_url: z.string().optional()
});

export type GitLabCompareResult = z.infer<typeof GitLabCompareResultSchema>;

// GitLab Tree Response
export const GitLabTreeResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabTreeSchema)
});

export type GitLabTreeResponse = z.infer<typeof GitLabTreeResponseSchema>;

// GitLab Release
export const GitLabReleaseSchema = z.object({
  tag_name: z.string(),
  description: z.string().nullable(),
  name: z.string().nullable(),
  created_at: z.string(),
  released_at: z.string().optional(),
  author: GitLabUserSchema.optional(),
  commit: z.object({
    id: z.string(),
    short_id: z.string(),
    title: z.string(),
    created_at: z.string()
  }).optional(),
  milestones: z.array(z.object({
    id: z.number(),
    iid: z.number(),
    title: z.string(),
    state: z.string()
  })).optional(),
  commit_path: z.string().optional(),
  tag_path: z.string().optional(),
  assets: z.object({
    count: z.number(),
    sources: z.array(z.object({
      format: z.string(),
      url: z.string()
    })).optional(),
    links: z.array(z.object({
      id: z.number(),
      name: z.string(),
      url: z.string(),
      link_type: z.string().optional()
    })).optional()
  }).optional(),
  evidences: z.array(z.object({
    sha: z.string(),
    filepath: z.string(),
    collected_at: z.string()
  })).optional()
});

export type GitLabRelease = z.infer<typeof GitLabReleaseSchema>;

// GitLab Releases Response
export const GitLabReleasesResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabReleaseSchema)
});

export type GitLabReleasesResponse = z.infer<typeof GitLabReleasesResponseSchema>;

// Branch Tool Schemas
export const ListBranchesSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  search: z.string().optional().describe("Search branches by name"),
  regex: z.string().optional().describe("Filter branches by regex"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const DeleteBranchSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  branch: z.string().describe("Branch name to delete"),
});

export const CompareBranchesSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  from: z.string().describe("Base branch/tag/commit SHA"),
  to: z.string().describe("Target branch/tag/commit SHA"),
  straight: z.boolean().optional().describe("Use straight comparison"),
});

// Tag Tool Schemas
export const ListTagsSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  search: z.string().optional().describe("Search tags by name"),
  order_by: z.enum(["name", "updated", "version"]).optional().describe("Order by field"),
  sort: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const CreateTagSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  tag_name: z.string().describe("Tag name"),
  ref: z.string().describe("Branch/commit SHA to create tag from"),
  message: z.string().optional().describe("Annotation message for annotated tag"),
  release_description: z.string().optional().describe("Release notes"),
});

// Repository Tree Schema
export const GetRepositoryTreeSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  path: z.string().optional().describe("Path inside repository"),
  ref: z.string().optional().describe("Branch/tag/commit to get tree from"),
  recursive: z.boolean().optional().describe("Get tree recursively"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

// Release Tool Schemas
export const ListReleasesSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  order_by: z.enum(["released_at", "created_at"]).optional().describe("Order by field"),
  sort: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  include_html_description: z.boolean().optional().describe("Include HTML description"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const CreateReleaseSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  tag_name: z.string().describe("Tag name for the release"),
  name: z.string().optional().describe("Release name"),
  description: z.string().optional().describe("Release description/notes"),
  ref: z.string().optional().describe("Branch/commit to create tag from (if tag doesn't exist)"),
  milestones: z.array(z.string()).optional().describe("Associated milestone titles"),
  released_at: z.string().optional().describe("Release date (ISO 8601)"),
});

// ============================================================================
// Issue Enhancement Schemas
// ============================================================================

export const UpdateIssueSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  issue_iid: z.number().describe("Issue internal ID"),
  title: z.string().optional().describe("New issue title"),
  description: z.string().optional().describe("New issue description"),
  assignee_ids: z.array(z.number()).optional().describe("Assignee user IDs"),
  milestone_id: z.number().nullable().optional().describe("Milestone ID"),
  labels: z.array(z.string()).optional().describe("Label names"),
  state_event: z.enum(["close", "reopen"]).optional().describe("State transition"),
  due_date: z.string().nullable().optional().describe("Due date (YYYY-MM-DD)"),
  confidential: z.boolean().optional().describe("Mark as confidential"),
});

export const CreateIssueNoteSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  issue_iid: z.number().describe("Issue internal ID"),
  body: z.string().describe("Note content"),
  internal: z.boolean().optional().describe("Create as internal note"),
});

// ============================================================================
// Label Schemas
// ============================================================================

export const GitLabLabelSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  text_color: z.string().optional(),
  description: z.string().nullable().optional(),
  description_html: z.string().optional(),
  open_issues_count: z.number().optional(),
  closed_issues_count: z.number().optional(),
  open_merge_requests_count: z.number().optional(),
  subscribed: z.boolean().optional(),
  priority: z.number().nullable().optional(),
  is_project_label: z.boolean().optional()
});

export type GitLabLabel = z.infer<typeof GitLabLabelSchema>;

export const GitLabLabelsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabLabelSchema)
});

export type GitLabLabelsResponse = z.infer<typeof GitLabLabelsResponseSchema>;

export const ListLabelsSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  search: z.string().optional().describe("Search labels by name"),
  include_ancestor_groups: z.boolean().optional().describe("Include ancestor group labels"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const CreateLabelSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  name: z.string().describe("Label name"),
  color: z.string().describe("Label color (hex code like #FF0000)"),
  description: z.string().optional().describe("Label description"),
  priority: z.number().optional().describe("Label priority"),
});

export const UpdateLabelSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  label_id: z.number().describe("Label ID"),
  new_name: z.string().optional().describe("New label name"),
  color: z.string().optional().describe("New label color"),
  description: z.string().optional().describe("New label description"),
  priority: z.number().nullable().optional().describe("New label priority"),
});

// ============================================================================
// Milestone Schemas
// ============================================================================

export const GitLabMilestoneSchema = z.object({
  id: z.number(),
  iid: z.number(),
  project_id: z.number().optional(),
  group_id: z.number().optional(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.enum(["active", "closed"]),
  created_at: z.string(),
  updated_at: z.string(),
  due_date: z.string().nullable(),
  start_date: z.string().nullable(),
  expired: z.boolean().optional(),
  web_url: z.string()
});

export type GitLabMilestone = z.infer<typeof GitLabMilestoneSchema>;

export const GitLabMilestonesResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabMilestoneSchema)
});

export type GitLabMilestonesResponse = z.infer<typeof GitLabMilestonesResponseSchema>;

export const ListMilestonesSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  iids: z.array(z.number()).optional().describe("Filter by milestone IIDs"),
  state: z.enum(["active", "closed"]).optional().describe("Filter by state"),
  title: z.string().optional().describe("Filter by title"),
  search: z.string().optional().describe("Search milestones by title/description"),
  include_parent_milestones: z.boolean().optional().describe("Include parent group milestones"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const CreateMilestoneSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  title: z.string().describe("Milestone title"),
  description: z.string().optional().describe("Milestone description"),
  due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
});

export const UpdateMilestoneSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  milestone_id: z.number().describe("Milestone ID"),
  title: z.string().optional().describe("New milestone title"),
  description: z.string().optional().describe("New milestone description"),
  due_date: z.string().nullable().optional().describe("New due date"),
  start_date: z.string().nullable().optional().describe("New start date"),
  state_event: z.enum(["close", "activate"]).optional().describe("State transition"),
});

// ============================================================================
// MR Enhancement Schemas
// ============================================================================

// MR Changes/Diffs
export const GitLabMergeRequestChangesSchema = GitLabMergeRequestSchema.extend({
  changes: z.array(z.object({
    old_path: z.string(),
    new_path: z.string(),
    a_mode: z.string().optional(),
    b_mode: z.string().optional(),
    new_file: z.boolean(),
    renamed_file: z.boolean(),
    deleted_file: z.boolean(),
    diff: z.string()
  })),
  changes_count: z.string().optional(),
  overflow: z.boolean().optional()
});

export type GitLabMergeRequestChanges = z.infer<typeof GitLabMergeRequestChangesSchema>;

export const GetMergeRequestChangesSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  access_raw_diffs: z.boolean().optional().describe("Get raw diff data"),
});

export const GetMergeRequestCommitsSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const UpdateMergeRequestSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  title: z.string().optional().describe("New MR title"),
  description: z.string().optional().describe("New MR description"),
  target_branch: z.string().optional().describe("New target branch"),
  assignee_ids: z.array(z.number()).optional().describe("Assignee user IDs"),
  reviewer_ids: z.array(z.number()).optional().describe("Reviewer user IDs"),
  labels: z.array(z.string()).optional().describe("Label names"),
  milestone_id: z.number().nullable().optional().describe("Milestone ID"),
  state_event: z.enum(["close", "reopen"]).optional().describe("State transition"),
  remove_source_branch: z.boolean().optional().describe("Remove source branch after merge"),
  squash: z.boolean().optional().describe("Squash commits on merge"),
  draft: z.boolean().optional().describe("Mark as draft"),
});

export const RebaseMergeRequestSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  skip_ci: z.boolean().optional().describe("Skip CI pipeline after rebase"),
});

export const CreateMergeRequestDiscussionSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  merge_request_iid: z.number().describe("MR internal ID"),
  body: z.string().describe("Discussion content"),
  position: z.object({
    base_sha: z.string().describe("Base commit SHA"),
    start_sha: z.string().describe("Start commit SHA"),
    head_sha: z.string().describe("Head commit SHA"),
    position_type: z.enum(["text", "image"]).describe("Position type"),
    old_path: z.string().optional().describe("File path before change"),
    new_path: z.string().optional().describe("File path after change"),
    old_line: z.number().nullable().optional().describe("Line number before change"),
    new_line: z.number().nullable().optional().describe("Line number after change"),
  }).optional().describe("Position for diff discussion"),
});

// ============================================================================
// Protected Branch Schemas
// ============================================================================

export const GitLabProtectedBranchSchema = z.object({
  id: z.number(),
  name: z.string(),
  push_access_levels: z.array(z.object({
    access_level: z.number(),
    access_level_description: z.string(),
    user_id: z.number().nullable().optional(),
    group_id: z.number().nullable().optional()
  })).optional(),
  merge_access_levels: z.array(z.object({
    access_level: z.number(),
    access_level_description: z.string(),
    user_id: z.number().nullable().optional(),
    group_id: z.number().nullable().optional()
  })).optional(),
  allow_force_push: z.boolean().optional(),
  code_owner_approval_required: z.boolean().optional()
});

export type GitLabProtectedBranch = z.infer<typeof GitLabProtectedBranchSchema>;

export const GitLabProtectedBranchesResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabProtectedBranchSchema)
});

export type GitLabProtectedBranchesResponse = z.infer<typeof GitLabProtectedBranchesResponseSchema>;

export const ListProtectedBranchesSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  search: z.string().optional().describe("Search by branch name"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const ProtectBranchSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  name: z.string().describe("Branch name or wildcard"),
  push_access_level: z.number().optional().describe("Access level for push (0=No one, 30=Developers, 40=Maintainers)"),
  merge_access_level: z.number().optional().describe("Access level for merge"),
  allow_force_push: z.boolean().optional().describe("Allow force push"),
  code_owner_approval_required: z.boolean().optional().describe("Require code owner approval"),
});

export const UnprotectBranchSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  name: z.string().describe("Branch name to unprotect"),
});

// ============================================================================
// Project Schemas
// ============================================================================

export const GitLabProjectDetailSchema = GitLabRepositorySchema.extend({
  path: z.string().optional(),
  path_with_namespace: z.string().optional(),
  issues_enabled: z.boolean().optional(),
  merge_requests_enabled: z.boolean().optional(),
  wiki_enabled: z.boolean().optional(),
  jobs_enabled: z.boolean().optional(),
  snippets_enabled: z.boolean().optional(),
  container_registry_enabled: z.boolean().optional(),
  creator_id: z.number().optional(),
  namespace: z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    kind: z.string(),
    full_path: z.string(),
    avatar_url: z.string().nullable().optional(),
    web_url: z.string().optional()
  }).optional(),
  import_status: z.string().optional(),
  open_issues_count: z.number().optional(),
  ci_config_path: z.string().nullable().optional(),
  shared_runners_enabled: z.boolean().optional(),
  archived: z.boolean().optional(),
  permissions: z.object({
    project_access: z.object({
      access_level: z.number(),
      notification_level: z.number().optional()
    }).nullable().optional(),
    group_access: z.object({
      access_level: z.number(),
      notification_level: z.number().optional()
    }).nullable().optional()
  }).optional()
});

export type GitLabProjectDetail = z.infer<typeof GitLabProjectDetailSchema>;

export const GetProjectSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  statistics: z.boolean().optional().describe("Include project statistics"),
  license: z.boolean().optional().describe("Include license information"),
  with_custom_attributes: z.boolean().optional().describe("Include custom attributes"),
});

export const UpdateProjectSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path"),
  name: z.string().optional().describe("New project name"),
  description: z.string().optional().describe("New project description"),
  default_branch: z.string().optional().describe("New default branch"),
  visibility: z.enum(["private", "internal", "public"]).optional().describe("Visibility level"),
  issues_enabled: z.boolean().optional().describe("Enable issues"),
  merge_requests_enabled: z.boolean().optional().describe("Enable merge requests"),
  wiki_enabled: z.boolean().optional().describe("Enable wiki"),
  jobs_enabled: z.boolean().optional().describe("Enable CI/CD"),
  archived: z.boolean().optional().describe("Archive project"),
});

// ============================================================================
// User Schemas
// ============================================================================

export const GitLabUserDetailSchema = GitLabUserSchema.extend({
  email: z.string().optional(),
  state: z.string().optional(),
  is_admin: z.boolean().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  public_email: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  organization: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  created_at: z.string().optional(),
  last_sign_in_at: z.string().nullable().optional(),
  confirmed_at: z.string().nullable().optional(),
  two_factor_enabled: z.boolean().optional(),
  identities: z.array(z.object({
    provider: z.string(),
    extern_uid: z.string()
  })).optional()
});

export type GitLabUserDetail = z.infer<typeof GitLabUserDetailSchema>;

export const GitLabUsersResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabUserDetailSchema)
});

export type GitLabUsersResponse = z.infer<typeof GitLabUsersResponseSchema>;

export const GetCurrentUserSchema = z.object({});

export const ListUsersSchema = z.object({
  username: z.string().optional().describe("Filter by username"),
  search: z.string().optional().describe("Search users"),
  active: z.boolean().optional().describe("Filter by active state"),
  blocked: z.boolean().optional().describe("Filter by blocked state"),
  external: z.boolean().optional().describe("Filter by external users"),
  order_by: z.enum(["id", "name", "username", "created_at", "updated_at"]).optional().describe("Order by field"),
  sort: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const GetUserSchema = z.object({
  user_id: z.number().describe("User ID"),
});

// ============================================================================
// Group Schemas
// ============================================================================

export const GitLabGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  path: z.string(),
  description: z.string().nullable().optional(),
  visibility: z.enum(["private", "internal", "public"]).optional(),
  share_with_group_lock: z.boolean().optional(),
  require_two_factor_authentication: z.boolean().optional(),
  two_factor_grace_period: z.number().optional(),
  project_creation_level: z.string().optional(),
  auto_devops_enabled: z.boolean().nullable().optional(),
  subgroup_creation_level: z.string().optional(),
  emails_disabled: z.boolean().nullable().optional(),
  mentions_disabled: z.boolean().nullable().optional(),
  lfs_enabled: z.boolean().optional(),
  avatar_url: z.string().nullable().optional(),
  web_url: z.string(),
  request_access_enabled: z.boolean().optional(),
  full_name: z.string().optional(),
  full_path: z.string().optional(),
  parent_id: z.number().nullable().optional(),
  created_at: z.string().optional()
});

export type GitLabGroup = z.infer<typeof GitLabGroupSchema>;

export const GitLabGroupsResponseSchema = z.object({
  count: z.number(),
  items: z.array(GitLabGroupSchema)
});

export type GitLabGroupsResponse = z.infer<typeof GitLabGroupsResponseSchema>;

export const ListGroupsSchema = z.object({
  search: z.string().optional().describe("Search groups by name"),
  owned: z.boolean().optional().describe("Filter to owned groups"),
  min_access_level: z.number().optional().describe("Minimum access level"),
  top_level_only: z.boolean().optional().describe("Only top-level groups"),
  order_by: z.enum(["name", "path", "id", "similarity"]).optional().describe("Order by field"),
  sort: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const GetGroupSchema = z.object({
  group_id: z.string().describe("Group ID or URL-encoded path"),
  with_custom_attributes: z.boolean().optional().describe("Include custom attributes"),
  with_projects: z.boolean().optional().describe("Include projects"),
});

export const ListGroupSubgroupsSchema = z.object({
  group_id: z.string().describe("Group ID or URL-encoded path"),
  search: z.string().optional().describe("Search by name"),
  owned: z.boolean().optional().describe("Filter to owned subgroups"),
  min_access_level: z.number().optional().describe("Minimum access level"),
  order_by: z.enum(["name", "path", "id", "similarity"]).optional().describe("Order by field"),
  sort: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  page: z.number().optional().describe("Page number (1-indexed)"),
  per_page: z.number().optional().describe("Results per page (1-100)"),
});

export const CreateGroupSchema = z.object({
  name: z.string().describe("Group name"),
  path: z.string().describe("Group path/URL"),
  description: z.string().optional().describe("Group description"),
  visibility: z.enum(["private", "internal", "public"]).optional().describe("Visibility level"),
  parent_id: z.number().optional().describe("Parent group ID for subgroup"),
  project_creation_level: z.enum(["noone", "maintainer", "developer"]).optional().describe("Who can create projects"),
  subgroup_creation_level: z.enum(["owner", "maintainer"]).optional().describe("Who can create subgroups"),
});

export const UpdateGroupSchema = z.object({
  group_id: z.string().describe("Group ID or URL-encoded path"),
  name: z.string().optional().describe("New group name"),
  path: z.string().optional().describe("New group path"),
  description: z.string().optional().describe("New group description"),
  visibility: z.enum(["private", "internal", "public"]).optional().describe("Visibility level"),
  project_creation_level: z.enum(["noone", "maintainer", "developer"]).optional().describe("Who can create projects"),
  subgroup_creation_level: z.enum(["owner", "maintainer"]).optional().describe("Who can create subgroups"),
});

export const DeleteGroupSchema = z.object({
  group_id: z.string().describe("Group ID or URL-encoded path"),
});