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
RUN pnpm --filter @app/db build
RUN pnpm --filter worker build

# Deploy pruned production dependencies
RUN pnpm --filter worker deploy --prod /app/pruned

# pnpm deploy makes a fresh production dependency tree. Prisma 5's generated
# client stays in the builder tree unless copied explicitly into that tree.
# Fail this Docker build if the generated code or target location is missing.
RUN set -eu; \
    source_schema="$(find /app/node_modules/.pnpm -type f -path '*/node_modules/.prisma/client/schema.prisma' -print -quit)"; \
    test -n "$source_schema"; \
    generated_dir="$(dirname "$source_schema")"; \
    copied=0; \
    for target_dir in /app/pruned/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client; do \
      if [ -d "$target_dir" ]; then \
        cp -a "$generated_dir/." "$target_dir/"; \
        test -s "$target_dir/schema.prisma"; \
        copied=1; \
      fi; \
    done; \
    test "$copied" -eq 1

# Check the actual production install, not just the build-time dependencies.
# Imports @app/db and constructs the singleton without connecting to Postgres.
RUN cd /app/pruned && node --input-type=module -e 'import("@app/db").then(() => console.log("Prisma Client production import OK"))'

# Stage 2: Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Ensure system dependencies (like FFmpeg/OpenSSL) are available in runtime
RUN apk add --no-cache openssl ffmpeg

ENV NODE_ENV=production

# Copy built application from builder stage
COPY --from=builder /app/pruned ./

CMD ["node", "dist/index.js"]