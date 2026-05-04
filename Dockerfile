# ---------------------------------------------------------------------------
# GitLab MCP Server — Production Dockerfile
# Multi-stage build for a minimal runtime image.
# ---------------------------------------------------------------------------

# -- Stage 1: build ----------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build TypeScript sources
COPY tsconfig.json ./
COPY src ./src
RUN npm run build


# -- Stage 2: runtime --------------------------------------------------------
FROM node:24-alpine

WORKDIR /app

# Install only production dependencies in runtime image
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled server
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production \
    PORT=3000 \
    USE_SSE=true

EXPOSE 3000

# Run as non-root using built-in node user (uid 1000)
RUN chown -R node:node /app
USER node

ENTRYPOINT ["node", "dist/index.js"]
