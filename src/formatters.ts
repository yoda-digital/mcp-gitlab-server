import {
  GitLabEventsResponse,
  GitLabCommitsResponse,
  GitLabIssuesResponse,
  GitLabMergeRequestsResponse,
  GitLabWikiPagesResponse,
  GitLabWikiPage,
  GitLabWikiAttachment,
  GitLabMembersResponse,
  GitLabNotesResponse,
  GitLabDiscussionsResponse,
  GitLabPipelinesResponse,
  GitLabJobsResponse,
  GitLabEnvironmentsResponse,
  GitLabBranchesResponse,
  GitLabTagsResponse,
  GitLabTreeResponse,
  GitLabReleasesResponse,
  GitLabLabelsResponse,
  GitLabMilestonesResponse,
  GitLabProtectedBranchesResponse,
  GitLabUsersResponse,
  GitLabGroupsResponse
} from './schemas.js';

/**
 * Formats the events response for better readability
 * 
 * @param events - The GitLab events response
 * @returns A formatted response object for the MCP tool
 */
export function formatEventsResponse(events: GitLabEventsResponse) {
  // Create a summary of the events
  const summary = `Found ${events.count} events`;

  // Format the events data
  const formattedEvents = events.items.map(event => ({
    id: event.id,
    action: event.action_name,
    author: event.author.name,
    created_at: event.created_at,
    target_type: event.target_type || null,
    target_title: event.target_title || null,
    push_data: event.push_data || null
  }));

  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedEvents, null, 2) }
    ]
  };
}

/**
 * Formats the commits response for better readability
 * 
 * @param commits - The GitLab commits response
 * @returns A formatted response object for the MCP tool
 */
export function formatCommitsResponse(commits: GitLabCommitsResponse) {
  // Create a summary of the commits
  const summary = `Found ${commits.count} commits`;

  // Format the commits data
  const formattedCommits = commits.items.map(commit => ({
    id: commit.id,
    short_id: commit.short_id,
    title: commit.title,
    author_name: commit.author_name,
    author_email: commit.author_email,
    created_at: commit.created_at,
    message: commit.message,
    web_url: commit.web_url,
    stats: commit.stats
  }));

  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedCommits, null, 2) }
    ]
  };
}

/**
 * Formats the issues response for better readability
 * 
 * @param issues - The GitLab issues response
 * @returns A formatted response object for the MCP tool
 */
export function formatIssuesResponse(issues: GitLabIssuesResponse) {
  // Create a summary of the issues
  const summary = `Found ${issues.count} issues`;

  // Format the issues data
  const formattedIssues = issues.items.map(issue => ({
    id: issue.id,
    iid: issue.iid,
    title: issue.title,
    description: issue.description,
    state: issue.state,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    labels: issue.labels,
    author: {
      name: issue.author.name,
      username: issue.author.username
    },
    assignees: issue.assignees.map(assignee => ({
      name: assignee.name,
      username: assignee.username
    })),
    web_url: issue.web_url
  }));

  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedIssues, null, 2) }
    ]
  };
}

/**
 * Formats the merge requests response for better readability
 * 
 * @param mergeRequests - The GitLab merge requests response
 * @returns A formatted response object for the MCP tool
 */
export function formatMergeRequestsResponse(mergeRequests: GitLabMergeRequestsResponse) {
  // Create a summary of the merge requests
  const summary = `Found ${mergeRequests.count} merge requests`;

  // Format the merge requests data
  const formattedMergeRequests = mergeRequests.items.map(mr => ({
    id: mr.id,
    iid: mr.iid,
    title: mr.title,
    description: mr.description,
    state: mr.state,
    merged: mr.merged,
    created_at: mr.created_at,
    updated_at: mr.updated_at,
    merged_at: mr.merged_at,
    closed_at: mr.closed_at,
    source_branch: mr.source_branch,
    target_branch: mr.target_branch,
    author: {
      name: mr.author.name,
      username: mr.author.username
    },
    assignees: mr.assignees.map(assignee => ({
      name: assignee.name,
      username: assignee.username
    })),
    web_url: mr.web_url
  }));

  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedMergeRequests, null, 2) }
    ]
  };
}

/**
 * Formats the wiki pages response for better readability
 *
 * @param wikiPages - The GitLab wiki pages response
 * @returns A formatted response object for the MCP tool
 */
export function formatWikiPagesResponse(wikiPages: GitLabWikiPagesResponse) {
  // Create a summary of the wiki pages
  const summary = `Found ${wikiPages.count} wiki pages`;

  // Format the wiki pages data
  const formattedWikiPages = wikiPages.items.map(page => ({
    slug: page.slug,
    title: page.title,
    format: page.format,
    content: page.content ? (page.content.length > 100 ? `${page.content.substring(0, 100)}...` : page.content) : null,
    created_at: page.created_at,
    updated_at: page.updated_at,
    web_url: page.web_url
  }));

  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedWikiPages, null, 2) }
    ]
  };
}

/**
 * Formats a single wiki page for better readability
 *
 * @param wikiPage - The GitLab wiki page
 * @returns A formatted response object for the MCP tool
 */
export function formatWikiPageResponse(wikiPage: GitLabWikiPage) {
  // Format the wiki page data
  const formattedWikiPage = {
    slug: wikiPage.slug,
    title: wikiPage.title,
    format: wikiPage.format,
    content: wikiPage.content,
    created_at: wikiPage.created_at,
    updated_at: wikiPage.updated_at,
    web_url: wikiPage.web_url
  };

  // Return the formatted response
  return {
    content: [
      { type: "text", text: `Wiki Page: ${wikiPage.title}` },
      { type: "text", text: JSON.stringify(formattedWikiPage, null, 2) }
    ]
  };
}

/**
 * Formats a wiki attachment response for better readability
 *
 * @param attachment - The GitLab wiki attachment
 * @returns A formatted response object for the MCP tool
 */
export function formatWikiAttachmentResponse(attachment: GitLabWikiAttachment) {
  // Format the attachment data
  const formattedAttachment = {
    file_name: attachment.file_name,
    file_path: attachment.file_path,
    branch: attachment.branch,
    commit_id: attachment.commit_id,
    url: attachment.url
  };

  // Return the formatted response
  return {
    content: [
      { type: "text", text: `Wiki Attachment: ${attachment.file_name}` },
      { type: "text", text: JSON.stringify(formattedAttachment, null, 2) }
    ]
  };
}

/**
 * Formats the members response for better readability
 * 
 * @param members - The GitLab members response
 * @returns A formatted response object for the MCP tool
 */
export function formatMembersResponse(members: GitLabMembersResponse) {
  // Create a summary of the members
  const summary = `Found ${members.count} members`;

  // Format the members data
  const formattedMembers = members.items.map(member => ({
    id: member.id,
    username: member.username,
    name: member.name,
    state: member.state,
    avatar_url: member.avatar_url,
    web_url: member.web_url,
    access_level: member.access_level,
    access_level_description: member.access_level_description,
    expires_at: member.expires_at
  }));

  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedMembers, null, 2) }
    ]
  };
}

/**
 * Formats the issue notes response for better readability
 *
 * @param notes - The GitLab notes response
 * @returns A formatted response object for the MCP tool
 */
export function formatNotesResponse(notes: GitLabNotesResponse) {
  // Create a summary of the notes
  const summary = `Found ${notes.count} notes`;

  // Format the notes data
  const formattedNotes = notes.items.map(note => ({
    id: note.id,
    body: note.body,
    author: {
      name: note.author.name,
      username: note.author.username
    },
    created_at: note.created_at,
    updated_at: note.updated_at,
    system: note.system,
    type: note.type || (note.system ? "system" : "comment")
  }));

  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedNotes, null, 2) }
    ]
  };
}

/**
 * Formats the issue discussions response for better readability
 *
 * @param discussions - The GitLab discussions response
 * @returns A formatted response object for the MCP tool
 */
export function formatDiscussionsResponse(discussions: GitLabDiscussionsResponse) {
  // Create a summary of the discussions
  const summary = `Found ${discussions.count} discussions`;

  // Format the discussions data
  const formattedDiscussions = discussions.items.map(discussion => ({
    id: discussion.id,
    individual_note: discussion.individual_note,
    notes: discussion.notes.map(note => ({
      id: note.id,
      body: note.body,
      author: {
        name: note.author.name,
        username: note.author.username
      },
      created_at: note.created_at,
      updated_at: note.updated_at,
      system: note.system,
      type: note.type || (note.system ? "system" : "comment")
    }))
  }));

  // Return the formatted response
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedDiscussions, null, 2) }
    ]
  };
}

/**
 * Formats the pipelines response for better readability
 */
export function formatPipelinesResponse(pipelines: GitLabPipelinesResponse) {
  const summary = `Found ${pipelines.count} pipelines`;

  const formattedPipelines = pipelines.items.map(pipeline => ({
    id: pipeline.id,
    status: pipeline.status,
    ref: pipeline.ref,
    sha: pipeline.sha.substring(0, 8),
    source: pipeline.source,
    created_at: pipeline.created_at,
    updated_at: pipeline.updated_at,
    web_url: pipeline.web_url,
    duration: pipeline.duration,
    user: pipeline.user ? { name: pipeline.user.name, username: pipeline.user.username } : null
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedPipelines, null, 2) }
    ]
  };
}

/**
 * Formats the jobs response for better readability
 */
export function formatJobsResponse(jobs: GitLabJobsResponse) {
  const summary = `Found ${jobs.count} jobs`;

  const formattedJobs = jobs.items.map(job => ({
    id: job.id,
    name: job.name,
    stage: job.stage,
    status: job.status,
    ref: job.ref,
    created_at: job.created_at,
    started_at: job.started_at,
    finished_at: job.finished_at,
    duration: job.duration,
    web_url: job.web_url,
    allow_failure: job.allow_failure,
    failure_reason: job.failure_reason
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedJobs, null, 2) }
    ]
  };
}

/**
 * Formats the environments response for better readability
 */
export function formatEnvironmentsResponse(environments: GitLabEnvironmentsResponse) {
  const summary = `Found ${environments.count} environments`;

  const formattedEnvironments = environments.items.map(env => ({
    id: env.id,
    name: env.name,
    slug: env.slug,
    state: env.state,
    external_url: env.external_url,
    tier: env.tier,
    last_deployment: env.last_deployment ? {
      id: env.last_deployment.id,
      ref: env.last_deployment.ref,
      status: env.last_deployment.status,
      created_at: env.last_deployment.created_at
    } : null
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedEnvironments, null, 2) }
    ]
  };
}

/**
 * Formats the branches response for better readability
 */
export function formatBranchesResponse(branches: GitLabBranchesResponse) {
  const summary = `Found ${branches.count} branches`;

  const formattedBranches = branches.items.map(branch => ({
    name: branch.name,
    protected: branch.protected,
    default: branch.default,
    merged: branch.merged,
    commit: {
      id: branch.commit.short_id,
      title: branch.commit.title,
      created_at: branch.commit.created_at,
      author_name: branch.commit.author_name
    },
    web_url: branch.web_url
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedBranches, null, 2) }
    ]
  };
}

/**
 * Formats the tags response for better readability
 */
export function formatTagsResponse(tags: GitLabTagsResponse) {
  const summary = `Found ${tags.count} tags`;

  const formattedTags = tags.items.map(tag => ({
    name: tag.name,
    message: tag.message,
    protected: tag.protected,
    commit: tag.commit ? {
      id: tag.commit.short_id,
      title: tag.commit.title,
      created_at: tag.commit.created_at
    } : null,
    release: tag.release
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedTags, null, 2) }
    ]
  };
}

/**
 * Formats the repository tree response for better readability
 */
export function formatTreeResponse(tree: GitLabTreeResponse) {
  const summary = `Found ${tree.count} items`;

  const formattedTree = tree.items.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    path: item.path,
    mode: item.mode
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedTree, null, 2) }
    ]
  };
}

/**
 * Formats the releases response for better readability
 */
export function formatReleasesResponse(releases: GitLabReleasesResponse) {
  const summary = `Found ${releases.count} releases`;

  const formattedReleases = releases.items.map(release => ({
    tag_name: release.tag_name,
    name: release.name,
    description: release.description ? (release.description.length > 100 ? `${release.description.substring(0, 100)}...` : release.description) : null,
    created_at: release.created_at,
    released_at: release.released_at,
    author: release.author ? { name: release.author.name, username: release.author.username } : null,
    assets: release.assets ? { count: release.assets.count } : null
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedReleases, null, 2) }
    ]
  };
}

/**
 * Formats the labels response for better readability
 */
export function formatLabelsResponse(labels: GitLabLabelsResponse) {
  const summary = `Found ${labels.count} labels`;

  const formattedLabels = labels.items.map(label => ({
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description,
    open_issues_count: label.open_issues_count,
    open_merge_requests_count: label.open_merge_requests_count,
    priority: label.priority
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedLabels, null, 2) }
    ]
  };
}

/**
 * Formats the milestones response for better readability
 */
export function formatMilestonesResponse(milestones: GitLabMilestonesResponse) {
  const summary = `Found ${milestones.count} milestones`;

  const formattedMilestones = milestones.items.map(milestone => ({
    id: milestone.id,
    iid: milestone.iid,
    title: milestone.title,
    description: milestone.description,
    state: milestone.state,
    due_date: milestone.due_date,
    start_date: milestone.start_date,
    expired: milestone.expired,
    web_url: milestone.web_url
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedMilestones, null, 2) }
    ]
  };
}

/**
 * Formats the protected branches response for better readability
 */
export function formatProtectedBranchesResponse(branches: GitLabProtectedBranchesResponse) {
  const summary = `Found ${branches.count} protected branches`;

  const formattedBranches = branches.items.map(branch => ({
    id: branch.id,
    name: branch.name,
    push_access_levels: branch.push_access_levels?.map(l => l.access_level_description),
    merge_access_levels: branch.merge_access_levels?.map(l => l.access_level_description),
    allow_force_push: branch.allow_force_push,
    code_owner_approval_required: branch.code_owner_approval_required
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedBranches, null, 2) }
    ]
  };
}

/**
 * Formats the users response for better readability
 */
export function formatUsersResponse(users: GitLabUsersResponse) {
  const summary = `Found ${users.count} users`;

  const formattedUsers = users.items.map(user => ({
    id: user.id,
    username: user.username,
    name: user.name,
    state: user.state,
    avatar_url: user.avatar_url,
    web_url: user.web_url,
    email: user.email,
    is_admin: user.is_admin
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedUsers, null, 2) }
    ]
  };
}

/**
 * Formats the groups response for better readability
 */
export function formatGroupsResponse(groups: GitLabGroupsResponse) {
  const summary = `Found ${groups.count} groups`;

  const formattedGroups = groups.items.map(group => ({
    id: group.id,
    name: group.name,
    path: group.path,
    full_path: group.full_path,
    description: group.description,
    visibility: group.visibility,
    parent_id: group.parent_id,
    web_url: group.web_url
  }));

  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(formattedGroups, null, 2) }
    ]
  };
}