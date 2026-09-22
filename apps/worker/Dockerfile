# Stage 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL & FFmpeg (FFmpeg is required if worker handles video processing)
RUN apk add --no-cache openssl ffmpeg

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# Copy monorepo root configurations & manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/worker/package.json ./apps/worker/

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/worker ./apps/worker

ENV PNPM_ONLY_BUILT_DEPENDENCIES=@prisma/client,@prisma/engines,prisma,esbuild

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages, Prisma, and the worker app
RUN pnpm --filter @app/shared run build
RUN pnpm --filter @app/db exec prisma generate
RUN pnpm --filter worker build

# Deploy pruned production dependencies
RUN pnpm --filter worker deploy --prod /app/pruned

# Stage 2: Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Ensure system dependencies (like FFmpeg/OpenSSL) are available in runtime
RUN apk add --no-cache openssl ffmpeg

ENV NODE_ENV=production

# Copy built application from builder stage
COPY --from=builder /app/pruned ./

CMD ["node", "dist/index.js"]