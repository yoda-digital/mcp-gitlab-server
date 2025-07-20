import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitLabApi } from '../src/gitlab-api.js';
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

const apiUrl = 'https://gitlab.example.com/api/v4';
const token = 'test-token';

let gitlabApi: GitLabApi;
let mockFetch: any;

// Mock atob globally for base64 decoding
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

// Mock node-fetch module
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

beforeEach(async () => {
  // Get the mocked node-fetch
  const nodeFetch = await import('node-fetch');
  mockFetch = vi.mocked(nodeFetch.default);
  
  gitlabApi = new GitLabApi({ apiUrl, token });
  
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateCIYaml', () => {
  describe('Valid CI YAML validation', () => {
    it('should successfully validate valid CI YAML content', async () => {
      const validYaml = `
stages:
  - build
  - test

build_job:
  stage: build
  script:
    - echo "Building..."

test_job:
  stage: test
  script:
    - echo "Testing..."
`;

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

      const result = await gitlabApi.validateCIYaml('test-project', validYaml);

      expect(result).toEqual({
        valid: true,
        errors: [],
        warnings: [],
        merged_yaml: validYaml,
        includes: []
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/projects/test-project/ci/lint`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content: validYaml,
            include_merged_yaml: true
          })
        })
      );
    });

    it('should validate with warnings but still be valid', async () => {
      const yamlWithWarnings = `
stages:
  - build

build_job:
  stage: build
  script:
    - echo "Building..."
  only:
    - master  # This might generate a warning about deprecated 'only' syntax
`;

      const mockResponse = {
        status: 'valid',
        errors: [],
        warnings: ['job:build_job uses deprecated "only" keyword'],
        merged_yaml: yamlWithWarnings,
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', yamlWithWarnings, false);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('deprecated "only" keyword');
      expect(result.errors).toHaveLength(0);

      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/projects/test-project/ci/lint`,
        expect.objectContaining({
          body: JSON.stringify({
            content: yamlWithWarnings,
            include_merged_yaml: false
          })
        })
      );
    });
  });

  describe('Invalid CI YAML validation', () => {
    it('should detect syntax errors in CI YAML', async () => {
      const invalidYaml = `
stages:
  - build
  - test

build_job:
  stage: build
  script:
    - echo "Building..."
  invalid_key: [unclosed_array
`;

      const mockResponse = {
        status: 'invalid',
        errors: ['YAML syntax error: unclosed array'],
        warnings: [],
        merged_yaml: '',
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', invalidYaml);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('YAML syntax error');
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect logical errors in CI configuration', async () => {
      const logicallyInvalidYaml = `
stages:
  - build
  - test

test_job:
  stage: deploy  # Stage not defined in stages
  script:
    - echo "Testing..."
`;

      const mockResponse = {
        status: 'invalid',
        errors: ['job:test_job uses undefined stage "deploy"'],
        warnings: [],
        merged_yaml: '',
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', logicallyInvalidYaml);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('undefined stage');
    });

    it('should handle multiple errors and warnings', async () => {
      const complexInvalidYaml = `
stages:
  - build

build_job:
  stage: deploy  # Error: undefined stage
  script:
    - echo "Building..."
  only:
    - master     # Warning: deprecated syntax

test_job:
  stage: test    # Error: undefined stage
  script:
    - echo "Testing..."
`;

      const mockResponse = {
        status: 'invalid',
        errors: [
          'job:build_job uses undefined stage "deploy"',
          'job:test_job uses undefined stage "test"'
        ],
        warnings: [
          'job:build_job uses deprecated "only" keyword'
        ],
        merged_yaml: '',
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', complexInvalidYaml);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('undefined stage "deploy"'),
        expect.stringContaining('undefined stage "test"')
      ]));
      expect(result.warnings[0]).toContain('deprecated "only" keyword');
    });
  });

  describe('Auto-loading .gitlab-ci.yml', () => {
    it('should auto-load .gitlab-ci.yml when no content provided', async () => {
      const ciYamlContent = `
stages:
  - build

build_job:
  stage: build
  script:
    - echo "Auto-loaded content"
`;

      // Mock successful file fetch
      const encodedContent = Buffer.from(ciYamlContent).toString('base64');
      
      // Mock the getFileContents method
      vi.spyOn(gitlabApi, 'getFileContents').mockResolvedValueOnce({
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
      });

      const mockLintResponse = {
        status: 'valid',
        errors: [],
        warnings: [],
        merged_yaml: ciYamlContent,
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLintResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project');

      expect(result.valid).toBe(true);
      expect(gitlabApi.getFileContents).toHaveBeenCalledWith('test-project', '.gitlab-ci.yml', 'main');
      
      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/projects/test-project/ci/lint`,
        expect.objectContaining({
          body: JSON.stringify({
            content: ciYamlContent,
            include_merged_yaml: true
          })
        })
      );
    });

    it('should throw error when no content provided and .gitlab-ci.yml not found', async () => {
      // Mock failed file fetch
      vi.spyOn(gitlabApi, 'getFileContents').mockRejectedValueOnce(
        new Error('File not found')
      );

      await expect(gitlabApi.validateCIYaml('test-project')).rejects.toThrow(McpError);
      await expect(gitlabApi.validateCIYaml('test-project')).rejects.toThrow(
        'No content provided and could not read .gitlab-ci.yml from project'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle GitLab API authentication errors', async () => {
      const validYaml = 'stages:\n  - build';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(gitlabApi.validateCIYaml('test-project', validYaml))
        .rejects.toThrow(McpError);
      await expect(gitlabApi.validateCIYaml('test-project', validYaml))
        .rejects.toThrow('GitLab CI lint API error: Unauthorized');
    });

    it('should handle GitLab API forbidden errors', async () => {
      const validYaml = 'stages:\n  - build';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      await expect(gitlabApi.validateCIYaml('test-project', validYaml))
        .rejects.toThrow(McpError);
      await expect(gitlabApi.validateCIYaml('test-project', validYaml))
        .rejects.toThrow('GitLab CI lint API error: Forbidden');
    });

    it('should handle GitLab API not found errors', async () => {
      const validYaml = 'stages:\n  - build';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(gitlabApi.validateCIYaml('test-project', validYaml))
        .rejects.toThrow(McpError);
      await expect(gitlabApi.validateCIYaml('test-project', validYaml))
        .rejects.toThrow('GitLab CI lint API error: Not Found');
    });

    it('should handle network errors', async () => {
      const validYaml = 'stages:\n  - build';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(gitlabApi.validateCIYaml('test-project', validYaml))
        .rejects.toThrow('Network error');
    });

    it('should handle malformed API response', async () => {
      const validYaml = 'stages:\n  - build';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Malformed JSON'))
      });

      await expect(gitlabApi.validateCIYaml('test-project', validYaml))
        .rejects.toThrow('Malformed JSON');
    });
  });

  describe('Project ID encoding', () => {
    it('should properly encode project IDs with special characters', async () => {
      const projectId = 'group/subgroup/project-name';
      const validYaml = 'stages:\n  - build';

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

      await gitlabApi.validateCIYaml(projectId, validYaml);

      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/projects/group%2Fsubgroup%2Fproject-name/ci/lint`,
        expect.any(Object)
      );
    });

    it('should handle numeric project IDs', async () => {
      const projectId = '12345';
      const validYaml = 'stages:\n  - build';

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

      await gitlabApi.validateCIYaml(projectId, validYaml);

      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/projects/12345/ci/lint`,
        expect.any(Object)
      );
    });
  });

  describe('Merged YAML handling', () => {
    it('should include merged YAML when requested', async () => {
      const baseYaml = `
include:
  - template: Auto-DevOps.gitlab-ci.yml

variables:
  CUSTOM_VAR: "value"
`;

      const mergedYaml = `
variables:
  CUSTOM_VAR: "value"
  AUTO_DEVOPS_VAR: "auto-value"

stages:
  - build
  - test
  - deploy

build:
  stage: build
  script: echo "Building"
`;

      const mockResponse = {
        status: 'valid',
        errors: [],
        warnings: [],
        merged_yaml: mergedYaml,
        includes: ['Auto-DevOps.gitlab-ci.yml']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', baseYaml, true);

      expect(result.valid).toBe(true);
      expect(result.merged_yaml).toBe(mergedYaml);
      expect(result.includes).toContain('Auto-DevOps.gitlab-ci.yml');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            content: baseYaml,
            include_merged_yaml: true
          })
        })
      );
    });

    it('should skip merged YAML when not requested', async () => {
      const baseYaml = 'stages:\n  - build';

      const mockResponse = {
        status: 'valid',
        errors: [],
        warnings: [],
        merged_yaml: '',
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', baseYaml, false);

      expect(result.valid).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            content: baseYaml,
            include_merged_yaml: false
          })
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty YAML content by auto-loading .gitlab-ci.yml', async () => {
      const emptyYaml = '';

      // When empty string is passed, it should try to auto-load .gitlab-ci.yml
      // This test verifies the auto-load behavior when .gitlab-ci.yml doesn't exist
      vi.spyOn(gitlabApi, 'getFileContents').mockRejectedValueOnce(
        new Error('File not found')
      );

      await expect(gitlabApi.validateCIYaml('test-project', emptyYaml))
        .rejects.toThrow(McpError);
      await expect(gitlabApi.validateCIYaml('test-project', emptyYaml))
        .rejects.toThrow('No content provided and could not read .gitlab-ci.yml from project');
    });

    it('should handle YAML with only whitespace', async () => {
      const whitespaceYaml = '   \n  \t  \n   ';

      const mockResponse = {
        status: 'invalid',
        errors: ['CI YAML contains only whitespace'],
        warnings: [],
        merged_yaml: '',
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', whitespaceYaml);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CI YAML contains only whitespace');
    });

    it('should handle very large YAML content', async () => {
      // Create a large YAML content
      const largeYaml = `
stages:
  - build
  - test

${Array.from({ length: 100 }, (_, i) => `
job_${i}:
  stage: ${i % 2 === 0 ? 'build' : 'test'}
  script:
    - echo "Job ${i} running"
    - sleep 1
`).join('')}
`;

      const mockResponse = {
        status: 'valid',
        errors: [],
        warnings: ['Large CI configuration may impact performance'],
        merged_yaml: largeYaml,
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', largeYaml);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Large CI configuration may impact performance');
    });

    it('should handle special characters in YAML content', async () => {
      const specialCharYaml = `
stages:
  - build

build_job:
  stage: build
  script:
    - echo "Testing special chars: åäö ñáéíóú ∑™£¢∞§¶"
    - echo "Emojis: 🚀 🔧 ✅ ❌"
  variables:
    SPECIAL_VAR: "äöüß"
`;

      const mockResponse = {
        status: 'valid',
        errors: [],
        warnings: [],
        merged_yaml: specialCharYaml,
        includes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gitlabApi.validateCIYaml('test-project', specialCharYaml);

      expect(result.valid).toBe(true);
      expect(result.merged_yaml).toContain('åäö ñáéíóú');
      expect(result.merged_yaml).toContain('🚀 🔧 ✅ ❌');
    });
  });
});