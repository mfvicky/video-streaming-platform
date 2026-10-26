# Commands & Scripts Reference

Run commands from the project root.

| Command                                         | Purpose                               |
| ----------------------------------------------- | ------------------------------------- |
| `corepack pnpm install --frozen-lockfile`       | Install pinned dependencies           |
| `corepack pnpm run build`                       | Build shared, DB, API, worker and web |
| `corepack pnpm run dev:api`                     | Develop API locally                   |
| `corepack pnpm run dev:worker`                  | Develop worker locally                |
| `corepack pnpm run dev:web`                     | Develop web locally                   |
| `corepack pnpm run db:generate`                 | Generate Prisma client                |
| `corepack pnpm run db:migrate`                  | Development Prisma migrations         |
| `corepack pnpm run test:api`                    | API tests                             |
| `corepack pnpm run test:worker`                 | Worker tests                          |
| `corepack pnpm run test:web`                    | Web tests                             |
| `corepack pnpm run lint`                        | ESLint                                |
| `corepack pnpm run format:check`                | Prettier check                        |
| `docker compose up -d --build`                  | Build and start stack                 |
| `docker compose ps -a`                          | See all containers and exit codes     |
| `docker compose logs --tail=100 api worker web` | Inspect logs                          |
| `docker compose run --rm migrate`               | Apply existing migrations             |

## Day 4 health endpoint tests

```bash
corepack pnpm --filter api exec vitest run src/routes/health.routes.test.ts
```

Expected: 3 passing tests for a healthy system, failed dependency, and disconnected broker.

**Not included in the six-file Day 4 change set:** automated full upload-to-HLS E2E smoke-test scripts. Do not claim these were run unless you have added an equivalent test yourself.
