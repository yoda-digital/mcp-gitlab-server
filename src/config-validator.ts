import { z } from 'zod';

// Environment variable schema
export const ConfigSchema = z.object({
  GITLAB_PERSONAL_ACCESS_TOKEN: z
    .string()
    .min(20, 'GitLab token should be at least 20 characters')
    .describe('GitLab Personal Access Token (required)'),
  
  GITLAB_API_URL: z
    .string()
    .url('GitLab API URL must be a valid URL')
    .default('https://gitlab.com/api/v4')
    .describe('GitLab API URL'),
  
  PORT: z
    .string()
    .regex(/^\d+$/, 'Port must be a number')
    .transform(val => parseInt(val))
    .refine(val => val >= 1 && val <= 65535, 'Port must be between 1 and 65535')
    .default('3000')
    .describe('Server port'),
  
  USE_SSE: z
    .string()
    .optional()
    .default('false')
    .transform(val => val === 'true')
    .describe('Use Server-Sent Events transport'),
  
  GITLAB_READ_ONLY_MODE: z
    .string()
    .optional()
    .default('false')
    .transform(val => val === 'true')
    .describe('Enable read-only mode')
});

export type ConfigType = z.infer<typeof ConfigSchema>;

// Legacy exports for backward compatibility with tests
export const EnvConfigSchema = ConfigSchema;

// Validate environment variables and return structured result
export function validateEnvironmentVariables() {
  try {
    const config = ConfigSchema.parse(process.env);
    const warnings: string[] = [];
    
    // Check for short tokens
    if (config.GITLAB_PERSONAL_ACCESS_TOKEN.length < 20) {
      warnings.push('GitLab token appears to be short. Typical tokens are 20+ characters.');
    }
    
    // Security warning for HTTP URLs
    if (config.GITLAB_API_URL.startsWith('http://')) {
      warnings.push('Using HTTP instead of HTTPS for GitLab API is not secure.');
    }
    
    return {
      success: true,
      errors: [],
      warnings,
      config
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        warnings: [],
        config: null
      };
    }
    throw error;
  }
}

export function validateEnvironment(): ConfigType {
  try {
    const config = ConfigSchema.parse(process.env);
    
    // Security warning for HTTP URLs
    if (config.GITLAB_API_URL.startsWith('http://')) {
      console.warn('⚠️  WARNING: Using HTTP instead of HTTPS is not recommended for security');
    }
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach(err => {
        console.error(`  • ${err.path.join('.')}: ${err.message}`);
      });
      
      console.log('\n💡 To fix configuration issues:');
      console.log('1. Set GITLAB_PERSONAL_ACCESS_TOKEN environment variable');
      console.log('2. Create token at: GitLab → User Settings → Access Tokens');
      console.log('3. Required scopes: read_api, read_repository, read_user');
      console.log('4. Run: export GITLAB_PERSONAL_ACCESS_TOKEN=your_token');
      
      process.exit(1);
    }
    throw error;
  }
}

export async function validateGitLabConnection(apiUrl: string, token: string): Promise<any> {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Test basic connectivity
    const response = await fetch(`${apiUrl}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorMessages: Record<number, string> = {
        401: 'Invalid or expired token',
        403: 'Token lacks required permissions',
        404: 'GitLab API endpoint not found',
        429: 'Rate limit exceeded',
        500: 'GitLab server error'
      };
      
      const message = errorMessages[response.status] || `HTTP ${response.status}`;
      throw new Error(`GitLab API authentication failed: ${message}`);
    }
    
    const user = await response.json();
    
    // Verify token permissions by testing read operations
    const permissionTests = [
      { url: `${apiUrl}/projects?per_page=1`, permission: 'read_api' },
      { url: `${apiUrl}/user`, permission: 'read_user' }
    ];
    
    const missingPermissions = [];
    
    for (const test of permissionTests) {
      try {
        const testResponse = await fetch(test.url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!testResponse.ok && testResponse.status === 403) {
          missingPermissions.push(test.permission);
        }
      } catch {
        // Network error, skip permission test
      }
    }
    
    if (missingPermissions.length > 0) {
      throw new Error(`Token missing permissions: ${missingPermissions.join(', ')}`);
    }
    
    return user;
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to GitLab API. Check network connectivity and API URL.');
    }
    throw error;
  }
}

// Validate full configuration including GitLab connection
export async function validateConfiguration(skipConnectionTest = false) {
  const envResult = validateEnvironmentVariables();
  
  if (!envResult.success) {
    return envResult;
  }
  
  if (skipConnectionTest || !envResult.config) {
    return envResult;
  }
  
  try {
    const user = await validateGitLabConnection(
      envResult.config.GITLAB_API_URL,
      envResult.config.GITLAB_PERSONAL_ACCESS_TOKEN
    );
    
    return {
      ...envResult,
      connectionValid: true,
      user
    };
  } catch (error: any) {
    return {
      ...envResult,
      success: false,
      errors: [...envResult.errors, error.message],
      connectionValid: false
    };
  }
}