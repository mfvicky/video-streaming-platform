# video-streaming-platform

A scalable, full-stack video processing pipeline built with Node.js, Express, React, TypeScript, and a microservice background worker architecture.

## Architecture Overview

- **Frontend (`apps/web`)**: React, TypeScript, Vite
- **Backend API (`apps/api`)**: Express, REST API, Swagger/OpenAPI, Pino, Zod
- **Worker (`apps/worker`)**: Node.js microservice consuming RabbitMQ queues, running FFmpeg tasks
- **Shared (`packages/shared`)**: Shared Zod schemas, TypeScript types, and constants
- **Database (`packages/db`)**: PostgreSQL managed via Prisma ORM
- **Queue**: RabbitMQ for asynchronous job scheduling
- **Cache & Progress**: Redis for job status tracking and caching
- **Object Storage**: MinIO (S3-compatible) for raw and processed video uploads

---

## Prerequisites

Ensure you have the following installed on your machine:

- Node.js: v20 or higher
- pnpm: v8 or higher
- Docker Desktop: For running PostgreSQL, Redis, RabbitMQ, and MinIO locally

---

### Run Husky

```bash
pnpm run prepare
```

### Run testing

```bash
pnpm run test
```

### Run prisma

```bash
pnpm run db:migrate
pnpm run db:generate
```

### Run Prettier

```bash
pnpm run format
pnpm run format:check
```

### Run docker setup

- PostgreSQL
- Redis
- RabbitMQ
- MinIO

```bash
docker compose pull
docker compose up -d
docker compose ps


docker compose up --build -d
docker compose build --no-cache api

docker exec -it dev_redis redis-cli

pnpm run test:services
```

## Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/mfvicky/video-streaming-platform.git
cd video-streaming-platform
pnpm install
```

### 2. Run application command

```bash
pnpm run dev:web
pnpm run dev:api
pnpm run dev:worker
```
