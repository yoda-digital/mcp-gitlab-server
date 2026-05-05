# ---------------------------------------------------------------------------
# GitLab MCP Server — Production Dockerfile
# Multi-stage build for a minimal runtime image.
# ---------------------------------------------------------------------------

# -- Stage 1: build ----------------------------------------------------------
FROM node:24-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS builder

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build TypeScript sources
COPY tsconfig.json ./
COPY src ./src
RUN npm run build


# -- Stage 2: runtime --------------------------------------------------------
FROM node:24-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f

WORKDIR /app

# Run as non-root using built-in node user (uid 1000).
# USER set before npm ci so node_modules are owned by node:node by construction.
RUN chown node:node /app
USER node

# Install only production dependencies (runs as node — owned by construction)
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled server
COPY --chown=node:node --from=builder /app/dist ./dist

ENV NODE_ENV=production \
    PORT=3000 \
    USE_SSE=true

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:${PORT:-3000}/livez || exit 1

ENTRYPOINT ["node", "dist/index.js"]
