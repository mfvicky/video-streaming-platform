# Docker Infrastructure Reference

The project uses Docker Compose to run local infrastructure dependencies during development.

## Services Overview

| Service        | Container Name | Default Port(s) | Description / Purpose                                                                                            |
| :------------- | :------------- | :-------------- | :--------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL** | `dev_postgres` | `5432`          | Primary relational database for user metadata, video records, and job tracking via Prisma ORM.                   |
| **Redis**      | `dev_redis`    | `6379`          | Key-value store for video processing status caching and job progress updates.                                    |
| **RabbitMQ**   | `dev_rabbitmq` | `5672`, `15672` | Message broker used by `apps/api` to dispatch asynchronous FFmpeg tasks to `apps/worker`. Express UI at `15672`. |
| **MinIO**      | `dev_minio`    | `9000`, `9001`  | S3-compatible object storage for storing raw video uploads and processed stream segments. Web console at `9001`. |

---

## Common Commands

### Pull & Start Infrastructure

```bash
# Pull the latest container images
docker compose pull

# Start all services in the background
docker compose up -d

# Check status of running containers
docker compose ps
```
