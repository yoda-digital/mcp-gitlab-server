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
 * Helper: wraps a JSON-serializable value into a single-item MCP text response.
 * All formatters use this to ensure the response is always a single structured
 * JSON content item — compatible with all MCP clients and gateways.
 */
function jsonResponse(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/**
 * Formats the events response.
 */
export function formatEventsResponse(events: GitLabEventsResponse) {
  return jsonResponse({
    count: events.count,
    items: events.items.map(event => ({
      id: event.id,
      action: event.action_name,
      author: event.author.name,
      created_at: event.created_at,
      target_type: event.target_type || null,
      target_title: event.target_title || null,
      push_data: event.push_data || null
    }))
  });
}

/**
 * Formats the commits response.
 */
export function formatCommitsResponse(commits: GitLabCommitsResponse) {
  return jsonResponse({
    count: commits.count,
    items: commits.items.map(commit => ({
      id: commit.id,
      short_id: commit.short_id,
      title: commit.title,
      author_name: commit.author_name,
      author_email: commit.author_email,
      created_at: commit.created_at,
      message: commit.message,
      web_url: commit.web_url,
      stats: commit.stats
    }))
  });
}

/**
 * Formats the issues response.
 */
export function formatIssuesResponse(issues: GitLabIssuesResponse) {
  return jsonResponse({
    count: issues.count,
    items: issues.items.map(issue => ({
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
    }))
  });
}

/**
 * Formats the merge requests response.
 */
export function formatMergeRequestsResponse(mergeRequests: GitLabMergeRequestsResponse) {
  return jsonResponse({
    count: mergeRequests.count,
    items: mergeRequests.items.map(mr => ({
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
    }))
  });
}

/**
 * Formats the wiki pages response.
 */
export function formatWikiPagesResponse(wikiPages: GitLabWikiPagesResponse) {
  return jsonResponse({
    count: wikiPages.count,
    items: wikiPages.items.map(page => ({
      slug: page.slug,
      title: page.title,
      format: page.format,
      content: page.content ? (page.content.length > 100 ? `${page.content.substring(0, 100)}...` : page.content) : null,
      created_at: page.created_at,
      updated_at: page.updated_at,
      web_url: page.web_url
    }))
  });
}

/**
 * Formats a single wiki page.
 */
export function formatWikiPageResponse(wikiPage: GitLabWikiPage) {
  return jsonResponse({
    slug: wikiPage.slug,
    title: wikiPage.title,
    format: wikiPage.format,
    content: wikiPage.content,
    created_at: wikiPage.created_at,
    updated_at: wikiPage.updated_at,
    web_url: wikiPage.web_url
  });
}

/**
 * Formats a wiki attachment response.
 */
export function formatWikiAttachmentResponse(attachment: GitLabWikiAttachment) {
  const url = attachment.link?.url ?? attachment.url ?? '';
  const markdown = attachment.link?.markdown ?? `![${attachment.file_name}](${url})`;
  return jsonResponse({
    file_name: attachment.file_name,
    file_path: attachment.file_path,
    branch: attachment.branch,
    url,
    markdown
  });
}

/**
 * Formats the members response.
 */
export function formatMembersResponse(members: GitLabMembersResponse) {
  return jsonResponse({
    count: members.count,
    items: members.items.map(member => ({
      id: member.id,
      username: member.username,
      name: member.name,
      state: member.state,
      avatar_url: member.avatar_url,
      web_url: member.web_url,
      access_level: member.access_level,
      access_level_description: member.access_level_description,
      expires_at: member.expires_at
    }))
  });
}

/**
 * Formats the issue notes response.
 */
export function formatNotesResponse(notes: GitLabNotesResponse) {
  return jsonResponse({
    count: notes.count,
    items: notes.items.map(note => ({
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
  });
}

/**
 * Formats the issue discussions response.
 */
export function formatDiscussionsResponse(discussions: GitLabDiscussionsResponse) {
  return jsonResponse({
    count: discussions.count,
    items: discussions.items.map(discussion => ({
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
    }))
  });
}

/**
 * Formats the pipelines response.
 */
export function formatPipelinesResponse(pipelines: GitLabPipelinesResponse) {
  return jsonResponse({
    count: pipelines.count,
    items: pipelines.items.map(pipeline => ({
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
    }))
  });
}

/**
 * Formats the jobs response.
 */
export function formatJobsResponse(jobs: GitLabJobsResponse) {
  return jsonResponse({
    count: jobs.count,
    items: jobs.items.map(job => ({
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
    }))
  });
}

/**
 * Formats the environments response.
 */
export function formatEnvironmentsResponse(environments: GitLabEnvironmentsResponse) {
  return jsonResponse({
    count: environments.count,
    items: environments.items.map(env => ({
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
    }))
  });
}

/**
 * Formats the branches response.
 */
export function formatBranchesResponse(branches: GitLabBranchesResponse) {
  return jsonResponse({
    count: branches.count,
    items: branches.items.map(branch => ({
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
    }))
  });
}

/**
 * Formats the tags response.
 */
export function formatTagsResponse(tags: GitLabTagsResponse) {
  return jsonResponse({
    count: tags.count,
    items: tags.items.map(tag => ({
      name: tag.name,
      message: tag.message,
      protected: tag.protected,
      commit: tag.commit ? {
        id: tag.commit.short_id,
        title: tag.commit.title,
        created_at: tag.commit.created_at
      } : null,
      release: tag.release
    }))
  });
}

/**
 * Formats the repository tree response.
 */
export function formatTreeResponse(tree: GitLabTreeResponse) {
  return jsonResponse({
    count: tree.count,
    items: tree.items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      path: item.path,
      mode: item.mode
    }))
  });
}

/**
 * Formats the releases response.
 */
export function formatReleasesResponse(releases: GitLabReleasesResponse) {
  return jsonResponse({
    count: releases.count,
    items: releases.items.map(release => ({
      tag_name: release.tag_name,
      name: release.name,
      description: release.description ? (release.description.length > 100 ? `${release.description.substring(0, 100)}...` : release.description) : null,
      created_at: release.created_at,
      released_at: release.released_at,
      author: release.author ? { name: release.author.name, username: release.author.username } : null,
      assets: release.assets ? { count: release.assets.count } : null
    }))
  });
}

/**
 * Formats the labels response.
 */
export function formatLabelsResponse(labels: GitLabLabelsResponse) {
  return jsonResponse({
    count: labels.count,
    items: labels.items.map(label => ({
      id: label.id,
      name: label.name,
      color: label.color,
      description: label.description,
      open_issues_count: label.open_issues_count,
      open_merge_requests_count: label.open_merge_requests_count,
      priority: label.priority
    }))
  });
}

/**
 * Formats the milestones response.
 */
export function formatMilestonesResponse(milestones: GitLabMilestonesResponse) {
  return jsonResponse({
    count: milestones.count,
    items: milestones.items.map(milestone => ({
      id: milestone.id,
      iid: milestone.iid,
      title: milestone.title,
      description: milestone.description,
      state: milestone.state,
      due_date: milestone.due_date,
      start_date: milestone.start_date,
      expired: milestone.expired,
      web_url: milestone.web_url
    }))
  });
}

/**
 * Formats the protected branches response.
 */
export function formatProtectedBranchesResponse(branches: GitLabProtectedBranchesResponse) {
  return jsonResponse({
    count: branches.count,
    items: branches.items.map(branch => ({
      id: branch.id,
      name: branch.name,
      push_access_levels: branch.push_access_levels?.map(l => l.access_level_description),
      merge_access_levels: branch.merge_access_levels?.map(l => l.access_level_description),
      allow_force_push: branch.allow_force_push,
      code_owner_approval_required: branch.code_owner_approval_required
    }))
  });
}

/**
 * Formats the users response.
 */
export function formatUsersResponse(users: GitLabUsersResponse) {
  return jsonResponse({
    count: users.count,
    items: users.items.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      state: user.state,
      avatar_url: user.avatar_url,
      web_url: user.web_url,
      email: user.email,
      is_admin: user.is_admin
    }))
  });
}

/**
 * Formats the groups response.
 */
export function formatGroupsResponse(groups: GitLabGroupsResponse) {
  return jsonResponse({
    count: groups.count,
    items: groups.items.map(group => ({
      id: group.id,
      name: group.name,
      path: group.path,
      full_path: group.full_path,
      description: group.description,
      visibility: group.visibility,
      parent_id: group.parent_id,
      web_url: group.web_url
    }))
  });
}
