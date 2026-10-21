# # Stage 1: Build Stage
# FROM node:20-alpine AS builder

# WORKDIR /app

# # Install OpenSSL (required for Prisma engines on Alpine)
# RUN apk add --no-cache openssl

# # Enable pnpm
# RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# # Copy monorepo root configurations & manifests
# COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
# COPY packages/shared/package.json ./packages/shared/
# COPY packages/db/package.json ./packages/db/
# COPY apps/api/package.json ./apps/api/

# # Copy all source files before running pnpm install so symlinks bind correctly
# COPY packages/shared ./packages/shared
# COPY packages/db ./packages/db
# COPY apps/api ./apps/api

# # Pass allowed built dependencies via environment variable
# ENV PNPM_ONLY_BUILT_DEPENDENCIES=@prisma/client,@prisma/engines,prisma,esbuild,@scarf/scarf

# # Install dependencies with full workspace source in place
# RUN pnpm install --frozen-lockfile

# # Build shared packages, generate Prisma client, and compile API
# RUN pnpm --filter @app/shared run build
# RUN pnpm --filter @app/db exec prisma generate
# RUN pnpm --filter api build

# # Deploy pruned production dependencies
# RUN pnpm --filter api deploy --prod /app/pruned

# # Stage 2: Runtime Stage
# FROM node:20-alpine AS runner

# WORKDIR /app

# RUN apk add --no-cache openssl

# ENV NODE_ENV=production

# # Copy pruned built application from builder stage
# COPY --from=builder /app/pruned ./

# EXPOSE 3000

# CMD ["node", "dist/index.js"]

# Stage 1: Build Stage
# FROM node:20-alpine AS builder

# RUN apk add --no-cache openssl
# RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# WORKDIR /app

# # Copy monorepo manifests
# COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
# COPY packages/shared/package.json ./packages/shared/
# COPY packages/db/package.json ./packages/db/
# COPY apps/api/package.json ./apps/api/

# # Install all dependencies
# RUN pnpm install --frozen-lockfile

# # Copy source code
# COPY packages/shared ./packages/shared
# COPY packages/db ./packages/db
# COPY apps/api ./apps/api

# # Generate Prisma Client & Build workspace packages
# RUN pnpm --filter @app/db run db:generate
# RUN pnpm --filter @app/shared run build
# RUN pnpm --filter api run build

# # Stage 2: Runtime Stage
# FROM node:20-alpine AS runner
# RUN apk add --no-cache openssl
# WORKDIR /app

# # Copy root configurations and API manifest
# COPY package.json pnpm-workspace.yaml ./
# COPY apps/api/package.json ./apps/api/

# # Install only production dependencies cleanly
# RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
# RUN pnpm install --prod --frozen-lockfile

# # Copy compiled build artifacts from builder
# COPY --from=builder /app/apps/api/dist ./apps/api/dist
# # Copy generated Prisma client node_modules if needed by API runtime
# COPY --from=builder /app/node_modules/.pnpm /app/node_modules/.pnpm

# EXPOSE 4000
# CMD ["node", "apps/api/dist/index.js"]


# Stage 1: Build Stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy monorepo manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (Make sure COPY is here!)
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Generate Prisma Client & Build workspace packages
RUN pnpm --filter @app/db run db:generate
RUN pnpm --filter @app/shared run build
RUN pnpm --filter api run build

# Stage 2: Runtime Stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
# RUN pnpm install --prod --frozen-lockfile --ignore-scripts
# RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/apps/api/dist ./apps/api/dist
# COPY --from=builder /app/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages /app/packages

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]