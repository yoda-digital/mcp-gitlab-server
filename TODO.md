High Priority Implementation:

1. ✅ API endpoint verified working with GITLAB_PERSONAL_ACCESS_TOKEN
2. Implement mcp**gitlab**validate_ci_yaml function
   mcp**gitlab**validate_ci_yaml(project_id: string, content?: string): Promise<CILintResponse>
3. Add POST /api/v4/projects/:id/ci/lint API call

   - Endpoint: POST https://gitlab.com/api/v4/projects/${project_id}/ci/lint
   - Headers: {"Content-Type": "application/json", "Authorization": "Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}"}
   - Body: {"content": yaml_content}

4. Handle authentication with GITLAB_PERSONAL_ACCESS_TOKEN

   - Use environment variable: process.env.GITLAB_PERSONAL_ACCESS_TOKEN
   - Add error handling for missing token

5. Fix YAML anchor reference issue causing script validation errors

   - The current .gitlab-ci.yml has YAML anchor syntax errors in the script sections

Implementation Details:

API Call Pattern:
curl -X POST "https://gitlab.com/api/v4/projects/71771195/ci/lint" \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}" \
 --data '{"content": "yaml_content_here"}'

Expected Response Format:
interface CILintResponse {
valid: boolean;
errors: string[];
warnings: string[];
merged_yaml: string;
includes?: any[];
}

Function Parameters:
{
project_id: string, // Required: "71771195" or "testing7075939/ami-rhel9-gold"
content?: string, // Optional: YAML content (auto-read from .gitlab-ci.yml if not provided)
include_merged_yaml?: boolean // Optional: include merged YAML in response
}
