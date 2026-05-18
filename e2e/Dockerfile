# ---------------------------------------------------------------------------
# GitLab MCP Server — E2E Test Runner
#
# Portable image to run E2E tests against any GitLab + MCP server.
# Usage:
#   docker run --rm --network host \
#     -e MCP_SERVER_URL=http://localhost:3000 \
#     -e GITLAB_URL=http://localhost:8080 \
#     -e GITLAB_ROOT_PASSWORD=secret \
#     ghcr.io/<repo>-e2e:<tag> [provision|test|teardown|all]
# ---------------------------------------------------------------------------

FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920

WORKDIR /app

# Install curl for health-check scripts
RUN apk add --no-cache curl bash jq

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy test sources and helpers
COPY tsconfig.json vitest.config.ts ./
COPY src ./src

# Default environment (override at runtime)
ENV GITLAB_URL=http://gitlab:80
ENV GITLAB_ROOT_PASSWORD="E2eTestPassword1!"
ENV GITLAB_TOKEN=""
ENV MCP_SERVER_URL=http://mcp-server:3000
ENV MCP_TRANSPORT=streamable-http
ENV NODE_ENV=test

COPY <<'EOF' /app/entrypoint.sh
#!/bin/bash
set -e

COMMAND="${1:-all}"

case "$COMMAND" in
  provision)
    echo "📋 Provisioning GitLab fixtures..."
    npx tsx src/scripts/provision-fixtures.ts
    ;;
  test)
    echo "🧪 Running E2E tests..."
    npm test
    ;;
  teardown)
    echo "🧹 Tearing down fixtures..."
    npx tsx src/scripts/teardown-fixtures.ts || true
    ;;
  all)
    echo "🚀 Full E2E run: provision → test → teardown"
    npx tsx src/scripts/provision-fixtures.ts
    npm test
    EXIT_CODE=$?
    npx tsx src/scripts/teardown-fixtures.ts || true
    exit $EXIT_CODE
    ;;
  wait)
    echo "⏳ Waiting for GitLab readiness..."
    ./src/scripts/wait-for-gitlab.sh
    ;;
  *)
    echo "Unknown command: $COMMAND"
    echo "Usage: docker run <image> [provision|test|teardown|all|wait]"
    exit 1
    ;;
esac
EOF

RUN chmod +x /app/entrypoint.sh

# Run as non-root
RUN chown -R node:node /app
USER node

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["all"]
