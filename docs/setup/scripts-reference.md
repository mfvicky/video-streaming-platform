```markdown
# Monorepo Scripts Reference

All operational commands run from the root `package.json` using `pnpm`.

## Development Commands

- `pnpm run dev:web`: Launches React frontend via Vite (`apps/web`).
- `pnpm run dev:api`: Starts Express API server with live reload (`apps/api`).
- `pnpm run dev:api:once`: Runs API server once without watcher.
- `pnpm run dev:worker`: Starts video processing background service (`apps/worker`).

## Database Management

- `pnpm run db:migrate`: Executes Prisma database migrations (`packages/db`).
- `pnpm run db:generate`: Generates Prisma Client types (`packages/db`).

## Code Quality & Testing

- `pnpm run lint`: Scans repository with ESLint.
- `pnpm run lint:fix`: Fixes lint warnings across workspace automatically.
- `pnpm run format`: Formats code base using Prettier.
- `pnpm run format:check`: Validates formatting status in CI pipeline.
- `pnpm run test:api`: Runs API component and unit tests via Vitest.
- `pnpm run test:services`: Verifies local connectivity to DB, Redis, RabbitMQ, and MinIO.
```
