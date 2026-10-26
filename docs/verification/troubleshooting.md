# Troubleshooting — Docker, FFmpeg, FFprobe and RabbitMQ

Use this order: **check container status → read relevant logs → verify dependencies → retry safely**. These commands are non-destructive.

## 1. API is unhealthy after `docker compose up -d`

```powershell
docker compose ps -a
docker compose logs --tail=150 api
curl.exe -i "http://localhost:3000/api/v1/health"
docker inspect video-streaming-platform-api-1 --format '{{range .State.Health.Log}}{{println .ExitCode .Output}}{{end}}'
```

| Result                                  | Meaning                                         | Action                                   |
| --------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| `200 {"status":"ok"}`                   | API is ready                                    | Start Web if it is still `Created`       |
| `503 {"status":"unavailable"}`          | DB, Redis, RabbitMQ or SILO bucket check failed | Inspect dependency logs                  |
| Connection refused                      | API not listening/restarting                    | Inspect API startup logs                 |
| `rabbitmq` connection refused initially | Broker may still be initializing                | Check broker health and API restart logs |

A Compose container can be healthy before every application-level connection succeeds. Increasing the API health `start_period` helps slow startup **only**; it does not fix bad credentials or a persistent connection error.

## 2. Web stays `Created`

Web waits for a healthy API. Once `docker compose ps -a` shows `api` as healthy:

```powershell
docker compose up -d web
curl.exe -I "http://localhost:3001/"
```

Expected: Web `healthy`, HTTP 200.

## 3. RabbitMQ connection drops / worker stops consuming

**Symptoms:** Videos remain `PENDING`, worker log reports `RabbitMQ connection failed; retrying`, or queue consumer count becomes 0.

```powershell
docker compose logs --tail=150 rabbitmq
docker compose logs --tail=150 worker
docker compose logs --tail=150 api
docker compose exec rabbitmq rabbitmq-diagnostics -q ping
docker compose exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
```

Check:

- RabbitMQ is **healthy** and port **5672** is reachable inside Docker.
- API and worker `RABBITMQ_URL` values use the hostname `rabbitmq` and the same credentials as the broker.
- Worker consumer count returns to 1 (or to the number of scaled workers). The worker code reconnects with backoff after a broker disconnect.
- API connection failure is intentionally visible at startup (Day 4 fail-fast). Docker may restart the API until the broker accepts connections.

**Do not** delete RabbitMQ volumes or purge queues just to recover a connection. Once API becomes healthy, restart Web if required.

## 4. FFmpeg or FFprobe executable missing

**Symptoms:** Worker logs contain `ENOENT`, `spawn ffmpeg`, `spawn ffprobe`, or `not found`.

```powershell
docker compose exec worker ffmpeg -version
docker compose exec worker ffprobe -version
docker compose logs --tail=150 worker
```

The worker Dockerfile installs both tools. If either is missing from the **container**, verify the worker image/build and the `FFMPEG_PATH` / `FFPROBE_PATH` environment values; rebuild only that image if necessary:

```powershell
docker compose build worker
docker compose up -d worker
```

For **local (non-Docker) worker development**, install FFmpeg and FFprobe on the host and verify both are on the host `PATH`. Do not assume Docker's binaries are available on Windows/macOS.

## 5. FFmpeg codec/encoder or HLS failure

**Symptoms:** `Unknown encoder 'libx264'`, `Unknown encoder 'aac'`, `Invalid data found when processing input`, or the video goes from `PROCESSING` to `PENDING`/`FAILED`.

```powershell
docker compose exec worker ffmpeg -hide_banner -encoders
docker compose exec worker ffmpeg -hide_banner -h encoder=libx264
docker compose logs --tail=200 worker
```

Check:

1. The binary supports **libx264** and **AAC** encoding (used by the worker).
2. The source contains a valid video stream. `FFprobe` rejects videos without valid width/height.
3. The worker uses an **optional audio map** (`0:a:0?`), so audio-less files should not fail merely because no audio track exists.
4. Source output resolutions are capped by input size; lower-resolution or portrait sources are not upscaled to 1080p.
5. The original source object can be retrieved from the private SILO bucket using the worker's configured credentials.

Use a **small disposable test video** to reproduce. A genuine invalid source will fail all allowed processing attempts; do not repeatedly upload the same corrupt file expecting a different result.

## 6. Job stuck `PENDING` / `PROCESSING`; retry and DLQ

```powershell
docker compose exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
docker compose logs --tail=200 worker
```

| Observation                                  | Meaning                                                        |
| -------------------------------------------- | -------------------------------------------------------------- |
| Main queue `messages_ready > 0`, consumers 0 | No worker is consuming; inspect worker logs                    |
| Main queue `messages_unacknowledged > 0`     | Worker accepted job and may be processing it                   |
| Retry queue has messages                     | A failed job is waiting ~15 seconds before returning to main   |
| DLQ has messages                             | Invalid/permanently failed jobs were retained                  |
| All queues show 0                            | Could mean success or no jobs; confirm PostgreSQL video status |

- Failed processing jobs have **3 total attempts** (initial + 2 retries). Successful jobs are acknowledged.
- After the third failure, the video becomes `FAILED` and a message is sent to `video_processing_queue.dlq`.
- Authenticated manual retry uses the application's retry UI or API; it is **not** automatic DLQ replay.
- Worker leases and unique job IDs help recover abandoned work without unnecessarily processing duplicates.

## 7. Multipart upload doesn't resume

- Sign in as the **same creator**; reselect the **same file**.
- Upload sessions expire after **24 hours**. Each part is **8 MiB**; the current maximum file size is **2,147,483,647 bytes**.
- Previously accepted parts live inside SILO's _multipart state_, not as ordinary visible objects.
- The browser recovers the saved session and the API identifies uploaded/missing parts.
- A processing **retry** is not a multipart **upload** resume; FFmpeg reprocesses the source.

## 8. Playback returns 401 / 403 / 404

`READY` public playback **does not require bearer JWT**. Verify you are calling a public playback route, not a protected creator or original-download route.

```powershell
curl.exe -i "http://localhost:3000/api/v1/health"
```

See [OpenAPI and Public Playback](openapi-authentication.md) for the exact public and protected endpoints. `404` can mean the video isn't READY yet. The original remains private and requires an owner/admin download ticket.

## 9. PowerShell curl mistake

Use `curl.exe` rather than PowerShell's `curl` alias, and provide a **plain quoted URL**, not a Markdown hyperlink.

```powershell
curl.exe -i "http://localhost:3000/api/v1/health"
```

## 10. Protect your data

`docker compose down` does **not** delete named volumes. **Never run `docker compose down -v`** unless intentionally deleting database/media data. Do not share `.env`, expanded database URLs, API tokens or private keys when asking for help.
