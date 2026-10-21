# # Stage 1: Build Stage
# FROM node:20-alpine AS builder

# WORKDIR /app

# # Install OpenSSL & FFmpeg (FFmpeg is required if worker handles video processing)
# RUN apk add --no-cache openssl ffmpeg

# # Enable pnpm
# RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# # Copy monorepo root configurations & manifests
# COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
# COPY packages/shared/package.json ./packages/shared/
# COPY packages/db/package.json ./packages/db/
# COPY apps/worker/package.json ./apps/worker/

# # Copy source files
# COPY packages/shared ./packages/shared
# COPY packages/db ./packages/db
# COPY apps/worker ./apps/worker

# ENV PNPM_ONLY_BUILT_DEPENDENCIES=@prisma/client,@prisma/engines,prisma,esbuild

# # Install dependencies
# RUN pnpm install --frozen-lockfile

# # Build shared packages, Prisma, and the worker app
# RUN pnpm --filter @app/shared run build
# RUN pnpm --filter @app/db exec prisma generate
# RUN pnpm --filter worker build

# # Deploy pruned production dependencies
# RUN pnpm --filter worker deploy --prod /app/pruned

# # Stage 2: Runtime Stage
# FROM node:20-alpine AS runner

# WORKDIR /app

# # Ensure system dependencies (like FFmpeg/OpenSSL) are available in runtime
# RUN apk add --no-cache openssl ffmpeg

# ENV NODE_ENV=production

# # Copy built application from builder stage
# COPY --from=builder /app/pruned ./

# CMD ["node", "dist/index.js"]

# Stage 1: Build Stage
# FROM node:20-alpine AS builder

# RUN apk add --no-cache openssl ffmpeg
# RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# WORKDIR /app

# # Copy monorepo manifests
# COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
# COPY packages/shared/package.json ./packages/shared/
# COPY packages/db/package.json ./packages/db/
# COPY apps/worker/package.json ./apps/worker/

# # Install all dependencies
# RUN pnpm install --frozen-lockfile

# # Copy source code
# COPY packages/shared ./packages/shared
# COPY packages/db ./packages/db
# COPY apps/worker ./apps/worker

# # Generate Prisma Client & Build workspace packages
# RUN pnpm --filter @app/db run db:generate
# RUN pnpm --filter @app/shared run build
# RUN pnpm --filter worker run build

# # Stage 2: Runtime Stage
# FROM node:20-alpine AS runner
# RUN apk add --no-cache openssl ffmpeg
# WORKDIR /app

# # Copy root configurations and worker manifest
# COPY package.json pnpm-workspace.yaml ./
# COPY apps/worker/package.json ./apps/worker/

# # Install only production dependencies cleanly
# RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
# RUN pnpm install --prod --frozen-lockfile

# # Copy compiled build artifacts from builder
# COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
# COPY --from=builder /app/node_modules/.pnpm /app/node_modules/.pnpm

# CMD ["node", "apps/worker/dist/index.js"]


# Stage 1: Build Stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl ffmpeg
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy monorepo manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/worker/package.json ./apps/worker/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/worker ./apps/worker

# Generate Prisma Client & Build workspace packages
RUN pnpm --filter @app/db run db:generate
RUN pnpm --filter @app/shared run build
RUN pnpm --filter worker run build

# Stage 2: Runtime Stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl ffmpeg
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy compiled build artifacts and dependencies from builder stage
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
# COPY --from=builder /app/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages /app/packages

CMD ["node", "apps/worker/dist/index.js"]