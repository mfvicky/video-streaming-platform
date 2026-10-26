# video-streaming-platform

A full-stack video streaming and processing application built with Node.js, Express, React, TypeScript, RabbitMQ, FFmpeg, PostgreSQL, Redis, and S3-compatible object storage.

## Architecture Overview

- **Frontend (`apps/web`)**: React, TypeScript, Vite, HLS.js
- **Backend (`apps/api`)**: Express REST API, JWT, Swagger, Zod
- **Worker (`apps/worker`)**: RabbitMQ consumer, FFmpeg transcoding to HLS
- **Shared (`packages/shared`)**: Shared schemas and types
- **Database (`packages/db`)**: PostgreSQL with Prisma
- **Infrastructure**: PostgreSQL, Redis, RabbitMQ, and MinIO-compatible SILO storage (Docker)

## Prerequisites

- Node.js 20+
- pnpm **9.4.0** (via Corepack, or installed globally)
- Docker Desktop (Windows/macOS) or Docker Engine + Compose (Linux)

Run commands from the **project root**. On this Mac, prefer `corepack pnpm` because another `pnpm` installation may conflict.

## Quick Start — Docker (Entire Application)

```bash
# First time only: generate .env and RSA keys
node scripts/setup-env.mjs

# Start the full stack
docker compose config --quiet
docker compose up --build -d
docker compose ps

# View logs
docker compose logs --tail=100 api worker web
```

- Web: http://localhost:3001
- API: http://localhost:3000
- RabbitMQ dashboard: http://localhost:15672
- Object storage console: http://localhost:9001
- PostgreSQL: `localhost:5433` (database connection, not a webpage)
- Redis: `localhost:6379` (database connection, not a webpage)
- Adminer (if added to Compose): http://localhost:8080
- Redis Insight (if added to Compose): http://localhost:5540

Database and dashboard credentials come from the **root `.env`**. Never commit `.env`.

## Local Development (Hot Reload)

### 0. Installation of corepack

```bash
# Upgrade Node.js
nvm install 22.22.2
nvm use 22.22.2

# Install updated Corepack
npm install -g corepack@0.36.0

# Enable it
corepack enable

# Activate project pnpm version
corepack install -g pnpm@9.4.0

# Verify
pnpm -v
```

### 1. Install and build workspace packages

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run db:generate
corepack pnpm --filter @app/shared build
corepack pnpm --filter @app/db build
```

### 2. Run infrastructure only in Docker

```bash
# Avoid duplicate API/worker processes and port conflicts
docker compose stop api worker web

docker compose up -d postgres redis rabbitmq minio
# Only needed when migrations have not yet been applied:
docker compose run --rm migrate
```

### 3. Configure local environment files

Create `apps/api/.env` and `apps/worker/.env` using the credentials/secrets from your **root `.env`**. For local services, use `localhost`, not Docker names like `postgres`, `rabbitmq`, or `minio`.

The important settings are:

```dotenv
DATABASE_URL=postgresql://app:<POSTGRES_PASSWORD>@localhost:5433/app_db?schema=public
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_URL=amqp://streamuser:<RABBITMQ_DEFAULT_PASS>@localhost:5672
QUEUE_NAME=video_processing_queue
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=<MINIO_ROOT_PASSWORD>
MINIO_BUCKET_NAME=videos
```

The API also requires `JWT_SECRET`, `REFRESH_SECRET`, `RSA_PUBLIC_KEY`, and `RSA_PRIVATE_KEY` copied from the root `.env`. Set `CORS_ORIGIN=http://localhost:5173`. Preserve the RSA keys' escaped `\n` formatting.

For the local frontend, create `apps/web/.env.local`:

```dotenv
VITE_API_URL=http://localhost:3000/api
VITE_RSA_PUBLIC_KEY=<RSA_PUBLIC_KEY_FROM_ROOT_ENV>
```

Replace all `<...>` placeholders with actual values. Never commit these local environment files.

### 4. Run services in separate terminals

```bash
# Terminal 1 — API
corepack pnpm run dev:api

# Terminal 2 — Worker
corepack pnpm run dev:worker

# Terminal 3 — Web
corepack pnpm run dev:web

# Build: Api, Web, Worker

pnpm --filter api build
pnpm --filter worker build
pnpm --filter web build

```

Local web: http://localhost:5173

> Do not run the Docker API/worker and local API/worker simultaneously unless you intentionally configure separate ports and queue consumers.

## Docker Commands

```bash
docker compose up -d                        # Start existing containers
docker compose up --build -d                # Build and start everything
docker compose up -d --build web            # Rebuild changed frontend
docker compose up -d --build api            # Rebuild changed API
docker compose up -d --build worker         # Rebuild changed worker
docker compose ps                           # Container status
docker compose logs -f api worker web       # Live logs (Ctrl+C to stop viewing)
docker compose logs --tail=100 worker       # Last 100 worker log lines
docker compose stop api worker web          # Stop app containers, keep infrastructure
docker compose down                         # Stop/remove containers, keep volumes
```

**Do not use `docker compose down -v` unless you want to delete database and storage data.**

## Prisma / Database

```bash
corepack pnpm run db:generate              # Generate Prisma Client
corepack pnpm --filter @app/db build       # Compile shared DB package
corepack pnpm run db:migrate               # Create/apply migrations locally (development)
docker compose run --rm migrate            # Apply existing migrations in Docker

docker compose exec postgres psql -U app -d app_db  # PostgreSQL CLI
# In psql, type: \dt  (list tables)
docker compose exec redis redis-cli ping   # Redis health (expect PONG)
```

For browser-based data access, use **Adminer** (`localhost:8080`) and **Redis Insight** (`localhost:5540`) if those optional dashboard services are included in your Compose file.

## Testing and Code Quality

```bash
corepack pnpm run test:api
corepack pnpm run test:web
corepack pnpm run test:worker
corepack pnpm run test:services            # Infrastructure service check

corepack pnpm run lint
corepack pnpm run lint:fix
corepack pnpm run format
corepack pnpm run format:check
corepack pnpm run prepare                  # Install Husky Git hooks
```

## Video Pipeline Verification

1. Open http://localhost:3001 and log in as a creator.
2. Upload a short MP4 file.
3. Check `docker compose logs -f api worker` for encoding progress.
4. Confirm HLS generation completes and the video plays in the browser.

## Local Admin Account (Development Only)

Public signup creates a regular `USER`. For a dedicated account registered as `admin@streamverse.com`, grant `ADMIN` only through trusted database access, then log in again:

```bash
docker compose exec postgres psql -U app -d app_db -c \
"UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'admin@streamverse.com' RETURNING id, email, role;"
```

## Step-by-step verification

### Test 1 — New health endpoint

```bash
corepack pnpm --filter api exec vitest run src/routes/health.routes.test.ts
```

### check the API build:

```bash
corepack pnpm --filter api build
```

### Test 2 — Clean Docker build

```bash
# Run from your project root:
docker compose config --quiet
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose up -d web
docker compose ps --all

Expected:
- API and Web: healthy.
- PostgreSQL, Redis, RabbitMQ, SILO: healthy.
- Worker: running.
- Migrate: exited successfully with code 0.
- Adminer and Redis Insight: running.

```

### Test 3 — API and Web health checks

```bash
curl -i http://localhost:3000/api/v1/health

# Expected:
{"status":"ok"}

curl -I http://localhost:3001/

# Expected HTTP 200.



# Verify Docker health:
docker inspect "$(docker compose ps -q api)" \
  --format '{{.State.Health.Status}}'

docker inspect "$(docker compose ps -q web)" \
  --format '{{.State.Health.Status}}'
```

### Test 4 — RabbitMQ jobs

```bash
docker compose exec rabbitmq rabbitmqctl list_queues \
name messages_ready messages_unacknowledged consumers

#check with two worker
docker compose up -d --scale worker=2 worker
docker compose logs -f worker
```

### Test 5 — Full video lifecycle

### Using the web application at http://localhost:3001:

1. Upload two videos and verify multipart progress.
2. Verify FFprobe metadata in PostgreSQL.
3. Confirm thumbnail and HLS playback.
4. Download an original video and verify it matches the uploaded file.
5. Delete the video and confirm it disappears from the gallery and storage.
   Verify metadata:

```bash
docker compose exec postgres psql -U app -d app_db -c \
'SELECT id,status,width,height,"durationSeconds","videoCodec","fileSizeBytes" FROM "Video" ORDER BY "createdAt" DESC LIMIT 5;'
```

### Test 6 — Authorization and security

Test Expected
Anonymous upload 401
Creator B deletes Creator A's video 403
Creator B downloads Creator A's original 403
Regular user accesses admin metrics 403
Anonymous raw storage object 403
Invalid login credentials 401
Excessive login requests 429
Normal HLS seeking No unexpected 429
Refresh-token rotation and logout Successful

### Test 7 — Existing automated suites

```bash
corepack pnpm run test:api
corepack pnpm run test:worker
corepack pnpm run test:web

corepack pnpm run lint
corepack pnpm run format:check
```

### docker e2e test

```bash
# Use an existing creator account in your application
$env:TEST_EMAIL = "creatorVicky2@videostream.com"
$env:TEST_PASSWORD = "password"

# Absolute path to a valid MP4
$env:VIDEO_FIXTURE_PATH = "C:\Users\vickys\Videos\testing-video\2024-11-11 15-39-40.mp4"

# Verify the video file exists
Test-Path $env:VIDEO_FIXTURE_PATH

# Execute end-to-end test
pnpm run test:e2e


Remove-Item Env:TEST_EMAIL
Remove-Item Env:TEST_PASSWORD
Remove-Item Env:VIDEO_FIXTURE_PATH



```
