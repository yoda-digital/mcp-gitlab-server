# AI CODE OF CONDUCT

## METADATA

- **FILE_TYPE**: AI_INSTRUCTION_SET
- **VERSION**: 1.3.1
- **CREATION_DATE**: 2025-03-18
- **TARGET_AUDIENCE**: AI_AGENTS_ONLY
- **SCOPE**: GITLAB_MCP_SERVER_PACKAGE_MAINTENANCE
- **PRIORITY**: ALL_RULES_MANDATORY
- **CONFLICT_RESOLUTION**: HIGHER_RULE_ID_TAKES_PRECEDENCE

## PURPOSE_DECLARATION

```
This document contains explicit instructions for AI agents working with the GitLab MCP Server package.
These rules are MANDATORY and must be followed EXACTLY as specified.
Each rule has a unique identifier, explicit steps, and verification criteria.
AI agents MUST NOT interpret, modify, or deviate from these instructions.
AI agents MUST report any ambiguity or uncertainty to human maintainers.
AI agents MUST NOT proceed if any verification step fails.
```

## RULE_DEFINITION_FORMAT

```
Each rule follows this structure:
- RULE_ID: Unique identifier (format: CATEGORY_NAME_NUMBER)
- RULE_TITLE: Short descriptive title
- RULE_PRIORITY: Importance level (P0=Critical, P1=High, P2=Medium, P3=Low)
- RULE_CONTEXT: Precise conditions when this rule applies
- RULE_STEPS: Numbered sequence of actions with explicit success criteria
- RULE_VERIFICATION: Objective measures to verify correct implementation
- RULE_EXCEPTIONS: Specific cases where rule may not apply (if any)
```

## RULES

### <RULE_ID:PKG_UPDATE_001>

#### RULE_TITLE: Package Update Procedure

#### RULE_PRIORITY: P0

#### RULE_CONTEXT: When making changes to the GitLab MCP Server package code that need to be published to npm

#### RULE_STEPS:

1. Implement code changes that address specific requirements or fix specific issues

   - Ensure all changes are committed to the appropriate branch
   - Verify all changes are included in the final commit

2. Increment the version number in package.json following semantic versioning:

   - MAJOR version for incompatible API changes
   - MINOR version for backward-compatible functionality additions
   - PATCH version for backward-compatible bug fixes
   - Example: change from "1.2.3" to "1.2.4" for a bug fix

3. **Publishing Process**:
   - **DO NOT** manually run `npm run build && npm publish`
   - Instead, commit and push changes to the main branch
   - The GitHub Action will automatically build and publish the package when changes are pushed to main
   - Monitor the GitHub Actions workflow to verify successful publication

#### RULE_VERIFICATION:

- Code changes successfully address the specific requirements or issues
- All automated tests pass with `npm test`
- Version number in package.json follows semantic versioning and has been incremented appropriately
- Changes are successfully pushed to the main branch
- GitHub Actions workflow completes successfully (check Actions tab in repository)
- Package is successfully published to npm registry (verify in npm registry)
- Package can be installed with `npm install @dangerusslee/gitlab-mcp-server@[new-version]`

#### RULE_EXCEPTIONS:

- None. This procedure must always be followed for all package updates.

### </RULE_ID:PKG_UPDATE_001>

### <RULE_ID:FEATURE_DEV_001>

#### RULE_TITLE: Feature Development Conventions

#### RULE_PRIORITY: P1

#### RULE_CONTEXT: When developing new features, fixing issues, or making any code changes to the GitLab MCP Server package

#### RULE_STEPS:

1. **Branch Creation**

   - Create a new branch from the latest version of `main` using the exact convention:
     - For features: `feature/descriptive-feature-name`
     - For fixes: `fix/issue-description`
     - For documentation: `docs/description`
     - For refactoring: `refactor/description`
   - Example: `feature/add-group-filtering` or `fix/cors-header-issue`
   - Use hyphens (-) not underscores (\_) or spaces in branch names

2. **Development Process**

   - Implement changes following these specific TypeScript practices:
     - Use TypeScript strict mode
     - Use explicit type annotations for function parameters and return types
     - Avoid using `any` type
     - Use interfaces for object shapes
     - Use enums for fixed sets of values
   - Keep commits small (under 300 lines of code per commit)
   - Use descriptive commit messages in format: `type: description`
     - Types must be one of: feat, fix, docs, style, refactor, test, chore
     - Example: `feat: add support for GitLab subgroups`

3. **Code Style Requirements**

   - Format code using the project's existing formatting rules
   - Use camelCase for variables and functions (e.g., `getUserData`)
   - Use PascalCase for classes, interfaces, and type aliases (e.g., `UserRepository`)
   - Use UPPER_SNAKE_CASE for constants (e.g., `DEFAULT_TIMEOUT`)
   - Variable and function names must be descriptive of their purpose
   - Add JSDoc comments for all public functions, classes, and interfaces with:
     - Description
     - @param tags for parameters
     - @returns tag for return value
     - @throws tag if applicable

4. **Testing Protocol**

   - Write unit tests for all new functionality with at least 80% code coverage
   - Tests must be in files named `*.test.ts` adjacent to the code being tested
   - Each test should focus on a single functionality
   - Ensure all existing tests pass with `npm test`
   - For UI or integration features, verify functionality with manual testing
   - Document manual testing steps and results if performed

5. **Documentation**

   - Update README.md when adding new features or changing existing functionality
   - Document new tools in the exact format shown in README.md, including:
     - Tool name and description
     - Complete parameter list with types and descriptions
     - Example JSON input and output
   - Add implementation details in the implementation directory for complex features
   - Update version history in documentation if applicable

6. **Merge Request Process**
   - Create a merge request targeting the `main` branch
   - Provide a description that includes:
     - Summary of changes
     - Purpose/motivation for changes
     - Testing performed
     - Screenshots or examples if applicable
   - Reference related issues with #issue_number format
   - Ensure CI/CD pipeline passes all checks
   - Request review from at least one project maintainer
   - Address all review comments before merging

#### RULE_VERIFICATION:

- Branch name exactly follows the specified naming convention
- All commits follow the required message format
- Code passes linting with no errors or warnings
- All new code has explicit type annotations
- JSDoc comments exist for all public APIs
- Test coverage meets or exceeds 80% for new code
- All tests pass with `npm test`
- Documentation is updated according to project standards
- Merge request contains all required information
- CI/CD pipeline passes all checks

#### RULE_EXCEPTIONS:

- Hotfixes for critical production issues may bypass some documentation requirements, but must be documented retrospectively within 24 hours
- Experimental features in branches prefixed with `experimental/` may have reduced test coverage requirements but must not be merged to main until fully tested

### </RULE_ID:FEATURE_DEV_001>

### <RULE_ID:DEP_MGMT_001>

#### RULE_TITLE: Dependency Management Protocol

#### RULE_PRIORITY: P1

#### RULE_CONTEXT: When adding, updating, or removing dependencies in the GitLab MCP Server package

#### RULE_STEPS:

1. **Dependency Evaluation**

   - Before adding a new dependency, evaluate:
     - Is it actively maintained? (last commit within 6 months)
     - Does it have security vulnerabilities? (check with `npm audit`)
     - Is it properly typed for TypeScript?
     - Is the license compatible with MIT license?
     - Could the functionality be implemented without the dependency?
   - Document the evaluation results in the commit message

2. **Adding Dependencies**

   - Add production dependencies with exact command:
     ```
     npm install --save dependency-name@version
     ```
   - Add development dependencies with exact command:
     ```
     npm install --save-dev dependency-name@version
     ```
   - Always specify exact versions (e.g., `@1.2.3`) not ranges (e.g., `^1.2.3`)
   - Update package.json and package-lock.json in the same commit

3. **Updating Dependencies**

   - Check for outdated dependencies with:
     ```
     npm outdated
     ```
   - Update dependencies one at a time, not in bulk
   - Test thoroughly after each update
   - Document breaking changes or required code modifications

4. **Removing Dependencies**

   - Remove unused dependencies with exact command:
     ```
     npm uninstall dependency-name
     ```
   - Ensure all imports and references are removed from code
   - Verify application still functions correctly after removal

5. **Security Auditing**

   - Run security audit with:
     ```
     npm audit
     ```
   - Address all high and critical vulnerabilities immediately
   - Document any vulnerabilities that cannot be resolved
   - Include audit in CI/CD pipeline

#### RULE_VERIFICATION:

- All new dependencies meet the evaluation criteria
- Dependencies are added with exact versions, not ranges
- package.json and package-lock.json are in sync
- No unused dependencies exist in the project
- Security audit passes with no high or critical vulnerabilities
- Application functions correctly with dependency changes

#### RULE_EXCEPTIONS:

- Temporary development dependencies for testing or debugging may be added without full evaluation but must be removed before merging to main
- Security patches may bypass normal evaluation process in emergency situations

### </RULE_ID:DEP_MGMT_001>

### <RULE_ID:DOC_CHANGE_001>

#### RULE_TITLE: Changelog Management

#### RULE_PRIORITY: P1

#### RULE_CONTEXT: When making changes that should be documented in the project changelog

#### RULE_STEPS:

1. **Commit Message Format**

   - Always use conventional commit messages as specified in FEATURE_DEV_001
   - Ensure commit messages follow the format: `type: description`
   - Valid types are: feat, fix, docs, style, refactor, test, chore
   - The automated changelog categorizes commits based on these prefixes:
     - `feat:` → Features section
     - `fix:` → Fixes section
     - `docs:` → Documentation section
     - Other types → Other section

2. **Changelog Verification**

   - After pushing changes to the repository, verify that:
     - The "Update Changelog" GitHub Action has run successfully
     - CHANGELOG.md has been updated with the new commits
     - Commits are correctly categorized based on their prefix
   - If the changelog was not updated correctly, investigate the GitHub Action logs

3. **Manual Changelog Updates (if needed)**

   - If the automated changelog requires manual correction:
     - Make necessary edits to CHANGELOG.md
     - Commit changes with message: `docs: manually update changelog [skip ci]`
     - The `[skip ci]` suffix prevents triggering CI workflows again

#### RULE_VERIFICATION:

- All commits follow the conventional commit format
- CHANGELOG.md is updated after each push with correctly categorized entries
- Each changelog entry includes the commit description, author, and date
- The changelog remains in reverse chronological order (newest entries at top)

#### RULE_EXCEPTIONS:

- Trivial changes like typo fixes may use abbreviated descriptions
- When fixing the changelog itself, always include `[skip ci]` in the commit message

### </RULE_ID:DOC_CHANGE_001>

## RULE_VERIFICATION_SECTION

```
AI agents MUST verify each step has been completed successfully before proceeding to the next step.
AI agents MUST use the exact verification criteria specified in each rule.
AI agents MUST NOT proceed if any verification step fails.
AI agents MUST halt the process and report the specific verification failure to human maintainers.
AI agents MUST NOT skip steps or modify the procedure under any circumstances.
AI agents MUST report completion of all steps with explicit confirmation of each verification point.
AI agents MUST include the RULE_ID when reporting on rule execution.
```

## ERROR_HANDLING_SECTION

```
When encountering errors or ambiguities, AI agents MUST:

1. IDENTIFY the specific error or ambiguity with exact details
2. REFERENCE the specific RULE_ID and step where the issue occurred
3. HALT the current procedure immediately
4. REPORT the issue to human maintainers with:
   - RULE_ID and step number
   - Expected behavior
   - Actual behavior
   - Any error messages or logs
   - Recommended resolution (if available)
5. WAIT for explicit human instruction before proceeding
6. DOCUMENT the error and resolution for future reference

AI agents MUST NOT attempt to resolve ambiguities through interpretation.
AI agents MUST NOT continue with a procedure when verification has failed.
```

## CONFLICT_RESOLUTION_SECTION

```
If multiple rules appear to conflict:

1. Rules with higher PRIORITY (P0 > P1 > P2 > P3) take precedence
2. If PRIORITY is equal, rules with higher RULE_ID number take precedence
3. If still unclear, AI agents MUST halt and request human clarification
4. AI agents MUST document any conflicts encountered and their resolution
```

## DOCUMENT_VERSIONING

```
This document follows semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR version increments represent incompatible rule changes
- MINOR version increments represent new rules or rule extensions
- PATCH version increments represent clarifications or corrections

AI agents MUST check for updates to this document before beginning work.
AI agents MUST follow the most recent version of this document.
```

## END_OF_DOCUMENT
