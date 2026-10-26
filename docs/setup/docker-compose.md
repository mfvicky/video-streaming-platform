# Docker Compose — Local Stack

## 1. Services and ports

| Service         | Local address                       | Expected state            |
| --------------- | ----------------------------------- | ------------------------- |
| Web             | http://localhost:3001               | Healthy                   |
| API             | http://localhost:3000/api/v1/health | Healthy (HTTP 200)        |
| PostgreSQL      | localhost:5433                      | Healthy                   |
| Redis           | localhost:6379                      | Healthy                   |
| RabbitMQ        | localhost:5672                      | Healthy                   |
| RabbitMQ UI     | http://localhost:15672              | Available                 |
| SILO object API | http://localhost:9000               | Healthy                   |
| SILO console    | http://localhost:9001               | Available                 |
| Adminer         | http://localhost:8080               | Running                   |
| Redis Insight   | http://localhost:5540               | Running                   |
| Worker          | no HTTP port                        | Running                   |
| Migrate         | no HTTP port                        | **Exited (0)** is success |

Note: The Compose **service name remains `minio`** even though its image is the S3-compatible SILO fork.

## 2. Start and inspect

```bash
docker compose config --quiet
docker compose up -d
docker compose ps -a

docker compose logs --tail=100 api worker web
```

Build again after code changes:

```bash
docker compose up -d --build
```

## 3. Day 4 health checks

- The API checks PostgreSQL, Redis, the storage bucket and RabbitMQ.
- The web service waits for the **API to be healthy**.
- A temporarily unhealthy API can leave web in `Created` state. When API becomes healthy:

```bash
docker compose up -d web
```

## 4. Scale workers

```bash
docker compose up -d --scale worker=2 worker
docker compose exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
```

## 5. Protect your data

`docker compose down` removes containers and the network but **keeps named volumes**. Avoid `docker compose down -v` unless you intentionally want to delete stored data.

Credentials are in your local root `.env`. Do not commit or publish them.
