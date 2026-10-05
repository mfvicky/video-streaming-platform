# Video Streaming Platform Documentation

Welcome to the internal documentation for the **Video Streaming Platform** monorepo.

## Project Structure

- **`apps/web`**: React + TypeScript frontend built with Vite.
- **`apps/api`**: Express REST API (Swagger, Pino, Zod validation).
- **`apps/worker`**: Background worker handling FFmpeg video processing.
- **`packages/db`**: PostgreSQL database management using Prisma ORM.
- **`packages/shared`**: Shared Zod schemas, TypeScript types, and constants.

## Navigation Quick Links

- [Local Development Setup](./setup/local-development.md)
- [Docker Compose Services](./setup/docker-compose.md)
- [Scripts Reference](./setup/scripts-reference.md)
- [System Architecture Overview](./architecture/system-overview.md)
- [Queue & Worker Mechanics](./architecture/queue-processing.md)
