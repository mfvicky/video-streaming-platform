FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @app/shared build
# Vite environment variables MUST be available at build time.
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_RSA_PUBLIC_KEY
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_RSA_PUBLIC_KEY=${VITE_RSA_PUBLIC_KEY}
RUN pnpm --filter web build

FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
