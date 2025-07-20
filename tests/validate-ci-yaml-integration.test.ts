import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitLabApi } from '../src/gitlab-api.js';
import { ValidateCIYamlSchema, CILintResponseSchema } from '../src/schemas.js';

// Mock node-fetch module at the top level
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

// Integration tests focusing on schema validation and function integration
describe('validate_ci_yaml Integration Tests', () => {
  let mockFetch: any;
  let gitlabApi: GitLabApi;
  
  beforeEach(async () => {
    // Get the mocked node-fetch
    const nodeFetch = await import('node-fetch');
    mockFetch = vi.mocked(nodeFetch.default);
    
    global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
    
    // Create GitLab API instance
    gitlabApi = new GitLabApi({
      apiUrl: 'https://gitlab.example.com/api/v4',
      token: 'test-token'
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Schema validation', () => {
    it('should validate ValidateCIYamlSchema with valid input', () => {
      const validInput = {
        project_id: 'test-project',
        content: 'stages:\n  - build',
        include_merged_yaml: true
      };

      const result = ValidateCIYamlSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.project_id).toBe('test-project');
        expect(result.data.content).toBe('stages:\n  - build');
        expect(result.data.include_merged_yaml).toBe(true);
      }
    });

    it('should validate ValidateCIYamlSchema with minimal input', () => {
      const minimalInput = {
        project_id: 'test-project'
      };

      const result = ValidateCIYamlSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.project_id).toBe('test-project');
        expect(result.data.content).toBeUndefined();
        expect(result.data.include_merged_yaml).toBeUndefined();
      }
    });

    it('should fail ValidateCIYamlSchema validation with missing project_id', () => {
      const invalidInput = {
        content: 'stages:\n  - build'
      };

      const result = ValidateCIYamlSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate CILintResponseSchema with complete response', () => {
      const validResponse = {
        valid: true,
        errors: [],
        warnings: ['Some warning'],
        merged_yaml: 'stages:\n  - build',
        includes: ['template.yml']
      };

      const result = CILintResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.valid).toBe(true);
        expect(result.data.errors).toEqual([]);
        expect(result.data.warnings).toEqual(['Some warning']);
        expect(result.data.merged_yaml).toBe('stages:\n  - build');
        expect(result.data.includes).toEqual(['template.yml']);
      }
    });

    it('should validate CILintResponseSchema with error response', () => {
      const errorResponse = {
        valid: false,
        errors: ['Syntax error'],
        warnings: [],
        merged_yaml: ''
      };

      const result = CILintResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.valid).toBe(false);
        expect(result.data.errors).toEqual(['Syntax error']);
        expect(result.data.warnings).toEqual([]);
        expect(result.data.merged_yaml).toBe('');
        expect(result.data.includes).toBeUndefined();
      }
    });
  });

  describe('Function integration', () => {
    it('should integrate validateCIYaml with schema validation for valid input', async () => {
      const validYaml = `
stages:
  - build
  - test

build_job:
  stage: build
  script:
    - echo "Building..."
`;

      // Mock the API response
      const mockResponse = {
        status: 'valid',
        errors: [],
        warnings: [],
        merged_yaml: validYaml,
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Test input schema validation
      const input = {
        project_id: 'test-project',
        content: validYaml,
        include_merged_yaml: true
      };

      const inputValidation = ValidateCIYamlSchema.safeParse(input);
      expect(inputValidation.success).toBe(true);

      // Test the function call
      const result = await gitlabApi.validateCIYaml(
        input.project_id,
        input.content,
        input.include_merged_yaml
      );

      // Test output schema validation
      const outputValidation = CILintResponseSchema.safeParse(result);
      expect(outputValidation.success).toBe(true);

      // Verify the actual result
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.merged_yaml).toBe(validYaml);
    });

    it('should handle error responses with proper schema validation', async () => {
      const invalidYaml = `
stages:
  - build

test_job:
  stage: nonexistent  # Invalid stage
  script:
    - echo "Testing..."
`;

      // Mock the API error response
      const mockResponse = {
        status: 'invalid',
        errors: ['job:test_job uses undefined stage "nonexistent"'],
        warnings: [],
        merged_yaml: '',
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Test input validation
      const input = {
        project_id: 'test-project',
        content: invalidYaml,
        include_merged_yaml: false
      };

      const inputValidation = ValidateCIYamlSchema.safeParse(input);
      expect(inputValidation.success).toBe(true);

      // Test the function call
      const result = await gitlabApi.validateCIYaml(
        input.project_id,
        input.content,
        input.include_merged_yaml
      );

      // Test output schema validation
      const outputValidation = CILintResponseSchema.safeParse(result);
      expect(outputValidation.success).toBe(true);

      // Verify the error result
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('job:test_job uses undefined stage "nonexistent"');
      expect(result.warnings).toEqual([]);
      expect(result.merged_yaml).toBe('');
    });

    it('should handle auto-loading .gitlab-ci.yml integration', async () => {
      const ciYamlContent = `
stages:
  - build

build_job:
  stage: build
  script:
    - echo "Auto-loaded content"
`;

      // Mock file content response
      const encodedContent = Buffer.from(ciYamlContent).toString('base64');
      const fileResponse = {
        content: encodedContent,
        file_name: '.gitlab-ci.yml',
        file_path: '.gitlab-ci.yml',
        size: ciYamlContent.length,
        encoding: 'base64',
        content_sha256: 'mock-sha',
        ref: 'main',
        blob_id: 'mock-blob-id',
        commit_id: 'mock-commit-id',
        last_commit_id: 'mock-last-commit-id'
      };

      // Mock lint response
      const lintResponse = {
        status: 'valid',
        errors: [],
        warnings: [],
        merged_yaml: ciYamlContent,
        includes: []
      };

      // Mock both API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(fileResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(lintResponse)
        });

      // Test input validation (no content provided)
      const input = {
        project_id: 'test-project'
      };

      const inputValidation = ValidateCIYamlSchema.safeParse(input);
      expect(inputValidation.success).toBe(true);

      // Test the function call without content
      const result = await gitlabApi.validateCIYaml(input.project_id);

      // Test output schema validation
      const outputValidation = CILintResponseSchema.safeParse(result);
      expect(outputValidation.success).toBe(true);

      // Verify the result
      expect(result.valid).toBe(true);
      expect(result.merged_yaml).toContain('Auto-loaded content');
      
      // Verify both API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should validate parameter type coercion', () => {
      // Test that optional boolean parameter is properly handled
      const inputWithString = {
        project_id: 'test-project',
        content: 'stages:\n  - build',
        include_merged_yaml: 'true' // String instead of boolean
      };

      // This should fail validation as the schema expects boolean
      const result = ValidateCIYamlSchema.safeParse(inputWithString);
      expect(result.success).toBe(false);
    });

    it('should validate required vs optional parameters', () => {
      // Test with all required parameters
      const completeInput = {
        project_id: 'test-project',
        content: 'stages:\n  - build',
        include_merged_yaml: true
      };

      const completeResult = ValidateCIYamlSchema.safeParse(completeInput);
      expect(completeResult.success).toBe(true);

      // Test with only required parameters
      const minimalInput = {
        project_id: 'test-project'
      };

      const minimalResult = ValidateCIYamlSchema.safeParse(minimalInput);
      expect(minimalResult.success).toBe(true);

      // Test without required parameter
      const incompleteInput = {
        content: 'stages:\n  - build'
      };

      const incompleteResult = ValidateCIYamlSchema.safeParse(incompleteInput);
      expect(incompleteResult.success).toBe(false);
    });
  });

  describe('Response transformation', () => {
    it('should properly transform GitLab API response to CILintResponse format', async () => {
      const yamlContent = 'stages:\n  - build';

      // Mock GitLab API response format
      const gitlabApiResponse = {
        status: 'valid',  // GitLab uses 'status' field
        errors: [],
        warnings: [],
        merged_yaml: yamlContent,
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(gitlabApiResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', yamlContent);

      // Verify transformation from GitLab's 'status' to our 'valid' boolean
      expect(result.valid).toBe(true);  // Should be transformed from status: 'valid'
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.merged_yaml).toBe(yamlContent);
      expect(result.includes).toEqual([]);

      // Ensure the result matches our schema
      const schemaValidation = CILintResponseSchema.safeParse(result);
      expect(schemaValidation.success).toBe(true);
    });

    it('should handle GitLab API response with invalid status', async () => {
      const yamlContent = 'invalid: yaml [';

      // Mock GitLab API response with invalid status
      const gitlabApiResponse = {
        status: 'invalid',  // GitLab uses 'status' field
        errors: ['YAML syntax error'],
        warnings: [],
        merged_yaml: '',
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(gitlabApiResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', yamlContent);

      // Verify transformation from GitLab's 'status' to our 'valid' boolean
      expect(result.valid).toBe(false);  // Should be transformed from status: 'invalid'
      expect(result.errors).toEqual(['YAML syntax error']);
      expect(result.warnings).toEqual([]);
      expect(result.merged_yaml).toBe('');

      // Ensure the result matches our schema
      const schemaValidation = CILintResponseSchema.safeParse(result);
      expect(schemaValidation.success).toBe(true);
    });
  });
});