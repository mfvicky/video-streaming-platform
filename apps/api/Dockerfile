# Stage 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL (required for Prisma engines on Alpine)
RUN apk add --no-cache openssl

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# Copy monorepo root configurations & manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Copy all source files before running pnpm install so symlinks bind correctly
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Pass allowed built dependencies via environment variable
ENV PNPM_ONLY_BUILT_DEPENDENCIES=@prisma/client,@prisma/engines,prisma,esbuild,@scarf/scarf

# Install dependencies with full workspace source in place
RUN pnpm install --frozen-lockfile

# Build shared packages, generate Prisma client, and compile API
RUN pnpm --filter @app/shared run build
RUN pnpm --filter @app/db exec prisma generate
RUN pnpm --filter @app/db build
RUN pnpm --filter api build

# Deploy pruned production dependencies
RUN pnpm --filter api deploy --prod /app/pruned

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

RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy pruned built application from builder stage
COPY --from=builder /app/pruned ./

EXPOSE 3000

CMD ["node", "dist/index.js"]