import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateEnvironmentVariables,
  validateGitLabConnection,
  validateConfiguration,
  EnvConfigSchema
} from '../src/config-validator.js';

describe('Config Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironmentVariables', () => {
    it('should pass with valid environment variables', () => {
      process.env.GITLAB_PERSONAL_ACCESS_TOKEN = 'glpat-test-token-12345678';
      process.env.GITLAB_API_URL = 'https://gitlab.com/api/v4';
      process.env.PORT = '3000';
      process.env.USE_SSE = 'false';
      process.env.GITLAB_READ_ONLY_MODE = 'false';

      const result = validateEnvironmentVariables();
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.config).toBeDefined();
      expect(result.config?.GITLAB_PERSONAL_ACCESS_TOKEN).toBe('glpat-test-token-12345678');
    });

    it('should fail when GITLAB_PERSONAL_ACCESS_TOKEN is missing', () => {
      delete process.env.GITLAB_PERSONAL_ACCESS_TOKEN;

      const result = validateEnvironmentVariables();
      expect(result.success).toBe(false);
      expect(result.errors).toContain('GITLAB_PERSONAL_ACCESS_TOKEN: GitLab Personal Access Token is required');
    });

    it('should use default values for optional variables', () => {
      process.env.GITLAB_PERSONAL_ACCESS_TOKEN = 'glpat-test-token-12345678';
      // Don't set optional variables

      const result = validateEnvironmentVariables();
      expect(result.success).toBe(true);
      expect(result.config?.GITLAB_API_URL).toBe('https://gitlab.com/api/v4');
      expect(result.config?.PORT).toBe(3000);
      expect(result.config?.USE_SSE).toBe(false);
      expect(result.config?.GITLAB_READ_ONLY_MODE).toBe(false);
    });

    it('should warn about short tokens', () => {
      process.env.GITLAB_PERSONAL_ACCESS_TOKEN = 'short-token';

      const result = validateEnvironmentVariables();
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('GitLab token appears to be shorter than expected (should be 20+ characters)');
    });

    it('should warn about HTTP URLs', () => {
      process.env.GITLAB_PERSONAL_ACCESS_TOKEN = 'glpat-test-token-12345678';
      process.env.GITLAB_API_URL = 'http://external-gitlab.com/api/v4';

      const result = validateEnvironmentVariables();
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Using HTTP instead of HTTPS for GitLab API may be insecure');
    });

    it('should fail with invalid port', () => {
      process.env.GITLAB_PERSONAL_ACCESS_TOKEN = 'glpat-test-token-12345678';
      process.env.PORT = '70000';

      const result = validateEnvironmentVariables();
      expect(result.success).toBe(false);
      expect(result.errors).toContain('PORT must be between 1 and 65535');
    });

    it('should fail with invalid URL', () => {
      process.env.GITLAB_PERSONAL_ACCESS_TOKEN = 'glpat-test-token-12345678';
      process.env.GITLAB_API_URL = 'not-a-url';

      const result = validateEnvironmentVariables();
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('must be a valid URL'))).toBe(true);
    });

    it('should fail with non-numeric port', () => {
      process.env.GITLAB_PERSONAL_ACCESS_TOKEN = 'glpat-test-token-12345678';
      process.env.PORT = 'not-a-number';

      const result = validateEnvironmentVariables();
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('must be a number'))).toBe(true);
    });
  });

  describe('EnvConfigSchema validation', () => {
    it('should validate correct environment variables', () => {
      const validEnv = {
        GITLAB_PERSONAL_ACCESS_TOKEN: 'glpat-test-token-12345678',
        GITLAB_API_URL: 'https://gitlab.com/api/v4',
        PORT: '3000',
        USE_SSE: 'false',
        GITLAB_READ_ONLY_MODE: 'false'
      };

      const result = EnvConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should apply defaults for missing optional fields', () => {
      const minimalEnv = {
        GITLAB_PERSONAL_ACCESS_TOKEN: 'glpat-test-token-12345678'
      };

      const result = EnvConfigSchema.safeParse(minimalEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.GITLAB_API_URL).toBe('https://gitlab.com/api/v4');
        expect(result.data.PORT).toBe('3000');
        expect(result.data.USE_SSE).toBe('false');
        expect(result.data.GITLAB_READ_ONLY_MODE).toBe('false');
      }
    });

    it('should reject invalid boolean values', () => {
      const invalidEnv = {
        GITLAB_PERSONAL_ACCESS_TOKEN: 'glpat-test-token-12345678',
        USE_SSE: 'maybe'
      };

      const result = EnvConfigSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });
  });

  describe('validateGitLabConnection', () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('should pass with valid GitLab API response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ username: 'testuser' })
        })
        .mockResolvedValue({ ok: true });

      const result = await validateGitLabConnection({
        apiUrl: 'https://gitlab.com/api/v4',
        token: 'valid-token'
      });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await validateGitLabConnection({
        apiUrl: 'https://gitlab.com/api/v4',
        token: 'invalid-token'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('GitLab token is invalid or expired');
    });

    it('should fail with 403 forbidden', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      const result = await validateGitLabConnection({
        apiUrl: 'https://gitlab.com/api/v4',
        token: 'insufficient-token'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('GitLab token does not have sufficient permissions');
    });

    it('should fail with 404 not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await validateGitLabConnection({
        apiUrl: 'https://wrong-url.com/api/v4',
        token: 'valid-token'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('GitLab API URL not found - check the URL');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateGitLabConnection({
        apiUrl: 'https://gitlab.com/api/v4',
        token: 'valid-token'
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('Failed to connect to GitLab API'))).toBe(true);
    });
  });

  describe('validateConfiguration', () => {
    it('should skip connection test when requested', async () => {
      process.env.GITLAB_PERSONAL_ACCESS_TOKEN = 'glpat-test-token-12345678';

      const result = await validateConfiguration(true);
      expect(result.success).toBe(true);
      // Should not have made any API calls
    });

    it('should fail on environment validation before connection test', async () => {
      delete process.env.GITLAB_PERSONAL_ACCESS_TOKEN;

      const result = await validateConfiguration(false);
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('GitLab Personal Access Token is required'))).toBe(true);
    });
  });
});