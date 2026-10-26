# Worker Service (`apps/worker`)

**Purpose:** processes queued videos **outside the API request** using FFprobe and FFmpeg.

## A worker's job

1. Consume a message from `video_processing_queue`.
2. Check the video ID and processing job ID in PostgreSQL (avoid duplicate work).
3. Download the original from SILO.
4. Extract video metadata (FFprobe).
5. Create thumbnail and HLS variants (FFmpeg).
6. Upload generated files to SILO.
7. Update database to `READY` or retry a failure.

## Worker scaling

```bash
docker compose up -d --scale worker=2 worker
# Check both worker consumers
docker compose exec rabbitmq rabbitmqctl list_queues name consumers
```

RabbitMQ `prefetch(1)` means **one active unacknowledged message per worker**. Two worker containers can handle two different videos concurrently (subject to host CPU/RAM).

## Reliability

- **3 attempts total**, delayed by the retry queue (**15 seconds**).
- Permanent errors go to DLQ.
- Worker reconnects after RabbitMQ connection loss.
- Unique job ID and SQL lease protect against duplicate/stale jobs.

## Logs

```bash
docker compose logs --tail=100 worker
```

Read [Queue Processing](../architecture/queue-processing.md).
