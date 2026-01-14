import { describe, it, expect } from 'vitest';
import {
  // CI/CD Schemas
  ListPipelinesSchema,
  GetPipelineSchema,
  TriggerPipelineSchema,
  ListPipelineJobsSchema,
  GetJobSchema,
  ListEnvironmentsSchema,
  // Repository Schemas
  ListBranchesSchema,
  DeleteBranchSchema,
  CompareBranchesSchema,
  ListTagsSchema,
  CreateTagSchema,
  GetRepositoryTreeSchema,
  ListReleasesSchema,
  CreateReleaseSchema,
  // Issue Schemas
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

describe('CI/CD Schemas', () => {
  describe('ListPipelinesSchema', () => {
    it('validates required project_id', () => {
      expect(() => ListPipelinesSchema.parse({})).toThrow();
      expect(ListPipelinesSchema.parse({ project_id: 'my-project' })).toEqual({ project_id: 'my-project' });
    });

    it('validates optional status enum', () => {
      const valid = ListPipelinesSchema.parse({
        project_id: 'my-project',
        status: 'success'
      });
      expect(valid.status).toBe('success');

      expect(() => ListPipelinesSchema.parse({
        project_id: 'my-project',
        status: 'invalid'
      })).toThrow();
    });

    it('validates pagination parameters', () => {
      const valid = ListPipelinesSchema.parse({
        project_id: 'my-project',
        page: 1,
        per_page: 50
      });
      expect(valid.page).toBe(1);
      expect(valid.per_page).toBe(50);
    });
  });

  describe('TriggerPipelineSchema', () => {
    it('requires project_id and ref', () => {
      expect(() => TriggerPipelineSchema.parse({ project_id: 'test' })).toThrow();
      expect(TriggerPipelineSchema.parse({ project_id: 'test', ref: 'main' })).toEqual({
        project_id: 'test',
        ref: 'main'
      });
    });

    it('accepts variables array', () => {
      const valid = TriggerPipelineSchema.parse({
        project_id: 'test',
        ref: 'main',
        variables: [{ key: 'VAR1', value: 'value1' }]
      });
      expect(valid.variables).toEqual([{ key: 'VAR1', value: 'value1' }]);
    });
  });

  describe('ListPipelineJobsSchema', () => {
    it('requires project_id and pipeline_id', () => {
      expect(() => ListPipelineJobsSchema.parse({ project_id: 'test' })).toThrow();
      expect(ListPipelineJobsSchema.parse({
        project_id: 'test',
        pipeline_id: 123
      })).toEqual({ project_id: 'test', pipeline_id: 123 });
    });
  });
});

describe('Repository Schemas', () => {
  describe('ListBranchesSchema', () => {
    it('validates required project_id', () => {
      expect(ListBranchesSchema.parse({ project_id: 'test' })).toEqual({ project_id: 'test' });
    });

    it('accepts search parameter', () => {
      const valid = ListBranchesSchema.parse({
        project_id: 'test',
        search: 'feature'
      });
      expect(valid.search).toBe('feature');
    });
  });

  describe('CreateTagSchema', () => {
    it('requires project_id, tag_name, and ref', () => {
      expect(() => CreateTagSchema.parse({ project_id: 'test' })).toThrow();
      expect(CreateTagSchema.parse({
        project_id: 'test',
        tag_name: 'v1.0.0',
        ref: 'main'
      })).toEqual({
        project_id: 'test',
        tag_name: 'v1.0.0',
        ref: 'main'
      });
    });

    it('accepts optional message', () => {
      const valid = CreateTagSchema.parse({
        project_id: 'test',
        tag_name: 'v1.0.0',
        ref: 'main',
        message: 'Release v1.0.0'
      });
      expect(valid.message).toBe('Release v1.0.0');
    });
  });

  describe('CompareBranchesSchema', () => {
    it('requires project_id, from, and to', () => {
      expect(() => CompareBranchesSchema.parse({ project_id: 'test' })).toThrow();
      expect(CompareBranchesSchema.parse({
        project_id: 'test',
        from: 'main',
        to: 'feature'
      })).toEqual({
        project_id: 'test',
        from: 'main',
        to: 'feature'
      });
    });
  });
});

describe('Label Schemas', () => {
  describe('CreateLabelSchema', () => {
    it('requires project_id, name, and color', () => {
      expect(() => CreateLabelSchema.parse({ project_id: 'test' })).toThrow();
      expect(CreateLabelSchema.parse({
        project_id: 'test',
        name: 'bug',
        color: '#FF0000'
      })).toEqual({
        project_id: 'test',
        name: 'bug',
        color: '#FF0000'
      });
    });
  });

  describe('UpdateLabelSchema', () => {
    it('requires project_id and label_id', () => {
      expect(() => UpdateLabelSchema.parse({ project_id: 'test' })).toThrow();
      expect(UpdateLabelSchema.parse({
        project_id: 'test',
        label_id: 1
      })).toEqual({
        project_id: 'test',
        label_id: 1
      });
    });
  });
});

describe('Milestone Schemas', () => {
  describe('CreateMilestoneSchema', () => {
    it('requires project_id and title', () => {
      expect(() => CreateMilestoneSchema.parse({ project_id: 'test' })).toThrow();
      expect(CreateMilestoneSchema.parse({
        project_id: 'test',
        title: 'v1.0'
      })).toEqual({
        project_id: 'test',
        title: 'v1.0'
      });
    });
  });
});

describe('MR Enhancement Schemas', () => {
  describe('UpdateMergeRequestSchema', () => {
    it('requires project_id and merge_request_iid', () => {
      expect(() => UpdateMergeRequestSchema.parse({ project_id: 'test' })).toThrow();
      expect(UpdateMergeRequestSchema.parse({
        project_id: 'test',
        merge_request_iid: 1
      })).toEqual({
        project_id: 'test',
        merge_request_iid: 1
      });
    });

    it('validates state_event enum', () => {
      const valid = UpdateMergeRequestSchema.parse({
        project_id: 'test',
        merge_request_iid: 1,
        state_event: 'close'
      });
      expect(valid.state_event).toBe('close');

      expect(() => UpdateMergeRequestSchema.parse({
        project_id: 'test',
        merge_request_iid: 1,
        state_event: 'invalid'
      })).toThrow();
    });
  });

  describe('RebaseMergeRequestSchema', () => {
    it('requires project_id and merge_request_iid', () => {
      expect(RebaseMergeRequestSchema.parse({
        project_id: 'test',
        merge_request_iid: 1
      })).toEqual({
        project_id: 'test',
        merge_request_iid: 1
      });
    });

    it('accepts skip_ci boolean', () => {
      const valid = RebaseMergeRequestSchema.parse({
        project_id: 'test',
        merge_request_iid: 1,
        skip_ci: true
      });
      expect(valid.skip_ci).toBe(true);
    });
  });
});

describe('Protected Branch Schemas', () => {
  describe('ProtectBranchSchema', () => {
    it('requires project_id and name', () => {
      expect(() => ProtectBranchSchema.parse({ project_id: 'test' })).toThrow();
      expect(ProtectBranchSchema.parse({
        project_id: 'test',
        name: 'main'
      })).toEqual({
        project_id: 'test',
        name: 'main'
      });
    });

    it('accepts access level options', () => {
      const valid = ProtectBranchSchema.parse({
        project_id: 'test',
        name: 'main',
        push_access_level: 40,
        merge_access_level: 30
      });
      expect(valid.push_access_level).toBe(40);
      expect(valid.merge_access_level).toBe(30);
    });
  });
});

describe('Group Schemas', () => {
  describe('CreateGroupSchema', () => {
    it('requires name and path', () => {
      expect(() => CreateGroupSchema.parse({ name: 'test' })).toThrow();
      expect(CreateGroupSchema.parse({
        name: 'Test Group',
        path: 'test-group'
      })).toEqual({
        name: 'Test Group',
        path: 'test-group'
      });
    });

    it('validates visibility enum', () => {
      const valid = CreateGroupSchema.parse({
        name: 'Test',
        path: 'test',
        visibility: 'private'
      });
      expect(valid.visibility).toBe('private');

      expect(() => CreateGroupSchema.parse({
        name: 'Test',
        path: 'test',
        visibility: 'invalid'
      })).toThrow();
    });
  });
});

describe('User Schemas', () => {
  describe('GetCurrentUserSchema', () => {
    it('accepts empty object', () => {
      expect(GetCurrentUserSchema.parse({})).toEqual({});
    });
  });

  describe('GetUserSchema', () => {
    it('requires user_id', () => {
      expect(() => GetUserSchema.parse({})).toThrow();
      expect(GetUserSchema.parse({ user_id: 1 })).toEqual({ user_id: 1 });
    });
  });

  describe('ListUsersSchema', () => {
    it('accepts search and filter parameters', () => {
      const valid = ListUsersSchema.parse({
        search: 'john',
        active: true
      });
      expect(valid.search).toBe('john');
      expect(valid.active).toBe(true);
    });
  });
});
