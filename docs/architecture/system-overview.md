# System Architecture

## Core Data Flow

1. **Upload Request**: Client (`apps/web`) requests a pre-signed upload URL from the API (`apps/api`).
2. **Object Ingestion**: File streams directly from client to MinIO storage bucket.
3. **Queue Ingestion**: API dispatches a video transcoding task to RabbitMQ and stores initial status in Redis/PostgreSQL.
4. **Worker Processing**: Background worker (`apps/worker`) picks up task, downloads source video, triggers FFmpeg to produce adaptive HLS/DASH streams, and writes processed output to MinIO.
5. **Real-Time Feedback**: Processing progress is cached in Redis and served back to the user interface.
