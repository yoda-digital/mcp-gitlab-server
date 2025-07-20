# Changelog

All notable changes to this project will be documented in this file.

## [0.2.14] - 2025-07-20

### Added
- CLI interface with --help, --version, --validate, and --list-tools flags
- Comprehensive environment variable validation with clear error messages
- GitLab API connectivity testing with token permission validation
- .env file support for easier configuration
- Improved README with troubleshooting guide and usage examples
- Configuration validator with detailed error reporting

### Fixed
- Binary path mismatch in package.json (now correctly points to dist/src/cli.js)
- npm start script now uses correct entry point
- Build process properly sets executable permissions
- Missing afterEach import in config-validator tests
- Silent failures now provide clear error messages

### Changed
- Entry point restructured for better CLI integration
- Package.json bin field updated for proper npx usage
- Enhanced error handling throughout the codebase

### Security
- Added token validation and permission checking
- Security warnings for HTTP API URLs
- Read-only mode documentation improved

## [0.2.13] - Previous version

- Initial GitLab MCP server implementation
- 36+ GitLab tools for comprehensive API integration
- Support for repository, file, issue, merge request, and CI/CD operations