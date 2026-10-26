# Local Development — Quick Start

## 1. Prerequisites

- Node.js **20+** and **pnpm 9.4.0** (via Corepack)
- Docker Desktop or Docker Engine with Compose
- Git

## 2. Setup (project root)

```bash
corepack pnpm install --frozen-lockfile
node scripts/setup-env.mjs  # First time only; keep existing .env and keys
corepack pnpm run db:generate
corepack pnpm run build
```

`setup-env.mjs` generates required `.env` values and a 2048-bit RSA key pair. **It refuses to overwrite an existing `.env`**. Do not re-run it against a working environment. See [RSA Keys and Environment Setup](rsa-keys.md) for first-time verification and security tips.

## 3. Run everything in Docker

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps -a
```

Visit http://localhost:3001. API readiness: http://localhost:3000/api/v1/health.

## 4. Or develop with hot reload

Keep infrastructure in Docker, but stop duplicated application services:

```bash
docker compose stop api worker web
docker compose up -d postgres redis rabbitmq minio
```

Provide `apps/api/.env`, `apps/worker/.env` and `apps/web/.env.local` with appropriate **localhost** endpoints as described in the root README. Then use separate terminals:

```bash
corepack pnpm run dev:api
corepack pnpm run dev:worker
corepack pnpm run dev:web
```

## 5. Useful checks

```bash
corepack pnpm run test:api
corepack pnpm run test:worker
corepack pnpm run test:web
corepack pnpm run lint
corepack pnpm run format:check
```

Read the root `README.md` for full configuration and never commit secret environment files.
