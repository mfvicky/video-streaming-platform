# # Stage 1: Build Stage
# FROM node:20-alpine AS builder

# WORKDIR /app

# # Enable pnpm
# RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# # Copy monorepo root configurations & manifests
# COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
# COPY packages/shared/package.json ./packages/shared/
# COPY apps/web/package.json ./apps/web/

# # Copy source code for web and shared packages
# COPY packages/shared ./packages/shared
# COPY apps/web ./apps/web

# # Install dependencies
# RUN pnpm install --frozen-lockfile

# # Build shared package first, then web app
# RUN pnpm --filter @app/shared run build
# RUN pnpm --filter web build

# # Stage 2: Runtime Stage
# FROM node:20-alpine AS runner

# WORKDIR /app

# ENV NODE_ENV=production
# ENV PORT=3000

# # Copy built app and dependencies
# COPY --from=builder /app/apps/web ./apps/web
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package.json ./package.json

# EXPOSE 3000

# CMD ["pnpm", "--filter", "web", "start"]

# # Stage 1: Build Stage
# FROM node:20-alpine AS builder

# RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# WORKDIR /app

# # 1. Copy root configurations and all workspace package manifests first
# COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
# COPY packages/shared/package.json ./packages/shared/
# COPY packages/db/package.json ./packages/db/
# COPY apps/web/package.json ./apps/web/

# # 2. Install dependencies safely across the whole workspace
# RUN pnpm install --frozen-lockfile

# # 3. Now copy the rest of the source code files
# COPY packages/shared ./packages/shared
# COPY packages/db ./packages/db
# COPY apps/web ./apps/web

# # 4. Build the shared library first
# RUN pnpm --filter @app/shared run build

# # 5. Pass build-time environment variables for Vite
# ARG VITE_API_URL
# ENV VITE_API_URL=$VITE_API_URL

# # 6. Build the Vite application
# RUN pnpm --filter web build

# # Stage 2: Serving Stage (Nginx)
# FROM nginx:alpine AS runner

# COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
# COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]



# Stage 1: Build Stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# 1. Copy root configurations and all workspace package manifests first
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/web/package.json ./apps/web/

# 2. Install dependencies safely across the whole workspace
RUN pnpm install --frozen-lockfile

# 3. Now copy the rest of the source code files for all workspace packages
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/web ./apps/web

# 4. Build the shared library first (if required by web or db)
RUN pnpm --filter @app/shared run build

# 5. Pass build-time environment variables for Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# 6. Build the Vite application
RUN pnpm --filter web build

# Stage 2: Serving Stage (Nginx)
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]