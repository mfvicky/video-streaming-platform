# Database Schema & Data Models

The platform uses **PostgreSQL** as its primary relational database, managed via **Prisma ORM** located inside `packages/db`.

## Data Management Commands

Run all database commands from the root directory:

```bash
# Apply migrations in local development
pnpm run db:migrate

# Regenerate Prisma Client types after modifying schema.prisma
pnpm run db:generate
```
