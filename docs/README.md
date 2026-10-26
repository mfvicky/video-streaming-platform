# Video Streaming Platform — Documentation

Simple guides to **what the platform does, how it works, and how to verify it**.

> Start with [Media Pipeline: Simple Explanation](MEDIA_PIPELINE.md) if you are new to this project.

## 1. Understand the platform

| Guide                                                      | What you will learn                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| [Media Pipeline: Simple Explanation](MEDIA_PIPELINE.md)    | Full flow, three RabbitMQ queues, views, uploads, and diagrams |
| [System Overview](architecture/system-overview.md)         | What each service does and how they connect                    |
| [Queue Processing](architecture/queue-processing.md)       | Main queue, retry queue, DLQ, acknowledgements                 |
| [Multipart Upload](architecture/multipart-upload.md)       | 8 MiB chunks, ETags, pause/resume, recovery                    |
| [Video Processing / HLS](architecture/media-processing.md) | FFprobe, thumbnails, resolutions, streaming                    |
| [Views, Downloads & Analytics](architecture/analytics.md)  | Redis view deduplication and database counters                 |
| [Database Schema](architecture/database-schema.md)         | User, Video, UploadSession, RefreshToken models                |

## 2. Run and understand the services

| Guide                                               | What you will learn                            |
| --------------------------------------------------- | ---------------------------------------------- |
| [Docker Compose](setup/docker-compose.md)           | Containers, ports, health checks, scaling      |
| [Local Development](setup/local-development.md)     | Setup and commands                             |
| [RSA Keys and Environment Setup](setup/rsa-keys.md) | Generate a key pair and safe first-run secrets |
| [Scripts Reference](setup/scripts-reference.md)     | Build, tests, database and formatting          |
| [API](services/api.md)                              | HTTP endpoints and authentication              |
| [Worker](services/worker.md)                        | Background video processing                    |
| [Web](services/web.md)                              | Upload, gallery, playback and dashboard        |

## 3. Verify before submission

- [Manual Verification Checklist](verification/manual-checklist.md)
- [Troubleshooting: FFmpeg, FFprobe, RabbitMQ and Docker](verification/troubleshooting.md)
- [Public Playback and OpenAPI Authentication](verification/openapi-authentication.md)
- [Release Checklist](verification/release-checklist.md)

## Architecture diagram

- [Original draw.io diagram](video-stream.drawio) — retained from your original docs.
- Mermaid diagrams are included in Markdown pages. They render automatically on GitHub.

## Note about Day 4

The six Day 4 changes provide an API readiness endpoint, health endpoint tests, RabbitMQ publishing/startup improvements, Docker health checks and README changes. **They do not add an automated end-to-end media pipeline smoke test**; that remains a separate release task.

This final documentation package includes an **optional OpenAPI-only patch**, so the displayed Swagger authentication requirements can match your existing public playback behavior. It is **not applied automatically** when extracting docs.
