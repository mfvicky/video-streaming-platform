````markdown
# Queue Processing & Job Lifecycle

The asynchronous video processing workflow relies on **RabbitMQ** for message queuing and **Redis** for state tracking.

## Architecture & Lifecycle Flow

```text
[Client] -> (Upload Video) -> [MinIO Storage]
                                   │
[apps/api] ──(Publish Job)──> [RabbitMQ Queue]
                                   │
                                   ▼
                            [apps/worker]
                                   │
                       (Fetch Video & Exec FFmpeg)
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
      (Update Progress in Redis)      (Upload Chunks to MinIO)
```
````
