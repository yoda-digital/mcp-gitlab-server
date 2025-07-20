#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get package.json for version info
const packageJsonPath = join(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// CLI argument parsing
const args = process.argv.slice(2);

// Show help information
function showHelp() {
  console.log(`
GitLab MCP Server v${packageJson.version}
${packageJson.description}

Usage:
  gitlab-mcp-server [options]

Options:
  --help, -h        Show this help message
  --version, -v     Show version information
  --validate        Validate configuration without starting server
  --list-tools      List all available GitLab MCP tools

Environment Variables:
  GITLAB_PERSONAL_ACCESS_TOKEN  GitLab Personal Access Token (required)
  GITLAB_API_URL               GitLab API URL (default: https://gitlab.com/api/v4)
  PORT                         Server port (default: 3000)
  USE_SSE                     Use Server-Sent Events transport (default: false)
  GITLAB_READ_ONLY_MODE       Enable read-only mode (default: false)

Examples:
  gitlab-mcp-server --help
  gitlab-mcp-server --validate
  GITLAB_PERSONAL_ACCESS_TOKEN=your_token gitlab-mcp-server

For more information, visit: ${packageJson.homepage}
`);
}

// Show version information
function showVersion() {
  console.log(`${packageJson.name} v${packageJson.version}`);
}

// List available tools
function showTools() {
  console.log(`
GitLab MCP Server Tools (${packageJson.version})

📁 Repository Management:
  • search_repositories      - Search for GitLab projects
  • create_repository        - Create a new GitLab project
  • fork_repository          - Fork a project to your account
  • list_projects           - List GitLab projects
  • get_project             - Get project details

📄 File Operations:
  • get_file_contents       - Get file or directory contents
  • create_or_update_file   - Create or update a single file
  • push_files              - Push multiple files in one commit

🌿 Branch Management:
  • create_branch           - Create a new branch

🐛 Issues & Merge Requests:
  • create_issue            - Create a new issue
  • list_issues             - Get project issues
  • create_merge_request    - Create a new merge request
  • list_merge_requests     - Get project merge requests
  • list_issue_notes        - Get issue comments
  • list_issue_discussions  - Get issue discussions

👥 Project Management:
  • list_group_projects     - List projects in a group
  • get_project_events      - Get project events/activities
  • list_commits            - Get commit history
  • list_project_members    - List project members
  • list_group_members      - List group members

📚 Wiki Management:
  • list_project_wiki_pages - List project wiki pages
  • get_project_wiki_page   - Get a project wiki page
  • create_project_wiki_page - Create project wiki page
  • edit_project_wiki_page  - Edit project wiki page
  • delete_project_wiki_page - Delete project wiki page
  • upload_project_wiki_attachment - Upload wiki attachment
  • list_group_wiki_pages   - List group wiki pages
  • get_group_wiki_page     - Get a group wiki page
  • create_group_wiki_page  - Create group wiki page
  • edit_group_wiki_page    - Edit group wiki page
  • delete_group_wiki_page  - Delete group wiki page
  • upload_group_wiki_attachment - Upload group wiki attachment

🔧 CI/CD Pipeline Management:
  • list_pipelines          - List project pipelines
  • get_pipeline            - Get pipeline details
  • get_pipeline_jobs       - List pipeline jobs
  • get_job                 - Get job details
  • get_job_log             - Get job execution log
  • create_pipeline         - Create a new pipeline
  • retry_pipeline          - Retry a failed pipeline
  • cancel_pipeline         - Cancel a running pipeline
  • retry_job               - Retry a specific job
  • cancel_job              - Cancel a running job

Total: 36+ GitLab integration tools available
`);
}

// Validate configuration
async function validateConfig() {
  console.log('Validating GitLab MCP Server configuration...\n');
  
  // Check required environment variables
  const token = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
  const apiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
  
  if (!token) {
    console.error('❌ GITLAB_PERSONAL_ACCESS_TOKEN is required but not set');
    console.log('\nTo fix this issue:');
    console.log('1. Go to GitLab → User Settings → Access Tokens');
    console.log('2. Create a new token with scopes: read_api, read_repository, read_user');
    console.log('3. Set the token: export GITLAB_PERSONAL_ACCESS_TOKEN=your_token_here');
    process.exit(1);
  }
  
  console.log('✅ GITLAB_PERSONAL_ACCESS_TOKEN is set');
  console.log(`✅ GitLab API URL: ${apiUrl}`);
  
  // Test GitLab API connectivity
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${apiUrl}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const user: any = await response.json();
      console.log(`✅ GitLab API connection successful`);
      console.log(`✅ Authenticated as: ${user.name} (@${user.username})`);
    } else {
      console.error(`❌ GitLab API authentication failed: ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        console.log('\nThe token appears to be invalid. Please check:');
        console.log('1. Token is correctly copied (no extra spaces)');
        console.log('2. Token has not expired');
        console.log('3. Token has required scopes: read_api, read_repository, read_user');
      }
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Failed to connect to GitLab API: ${error.message}`);
    console.log('\nPlease check:');
    console.log('1. Internet connectivity');
    console.log('2. GitLab API URL is correct');
    console.log('3. Corporate firewall/proxy settings');
    process.exit(1);
  }
  
  console.log('\n🎉 Configuration validation completed successfully!');
  console.log('You can now start the GitLab MCP Server.');
}

// Parse command line arguments
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
} else if (args.includes('--version') || args.includes('-v')) {
  showVersion();
} else if (args.includes('--list-tools')) {
  showTools();
} else if (args.includes('--validate')) {
  await validateConfig();
} else {
  // No CLI flags provided, start the server
  // Import and run the main server
  await import('./index.js');
}