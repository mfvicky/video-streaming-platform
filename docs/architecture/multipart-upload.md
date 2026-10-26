# Resumable Multipart Upload — Simple Guide

## 1. Why multipart upload?

Sending a 1 GB video as one request means a connection drop might force a complete restart. Instead, this project sends small pieces and can resume missing parts.

## 2. How it works

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as API
    participant D as PostgreSQL
    participant S as SILO/MinIO
    participant Q as RabbitMQ
    B->>A: Create upload session (title, size, filename)
    A->>S: Start S3 multipart upload
    A->>D: Save UploadSession
    A-->>B: Session ID + part size
    loop For each missing 8 MiB part
      B->>A: PUT part with authentication
      A->>S: Stream part, no whole-file buffer
      S-->>A: ETag
      A-->>B: Part uploaded
    end
    B->>A: Complete upload
    A->>S: List parts + finish multipart
    A->>D: Create Video PENDING
    A->>Q: Publish processing job
    A-->>B: Video ID
```

## 3. Size and recovery rules

| Setting                 | Current behavior                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Chunk size              | **8 MiB** except the final smaller part                                                    |
| Maximum file size       | **2,147,483,647 bytes** (just under 2 GiB)                                                 |
| Upload session lifetime | **24 hours**                                                                               |
| Part retry              | Up to **3 attempts** per part                                                              |
| Storage location        | Unfinished pieces stay inside S3 multipart state; only completion creates the final object |
| Session persistence     | PostgreSQL UploadSession; browser keeps session ID in **localStorage**                     |
| Matching file           | Browser fingerprint uses filename, size, modification time and a hash of first/last MiB    |

## 4. Pause and resume

```mermaid
flowchart TD
    STOP[Upload paused / connection lost] --> SAVED[Already uploaded parts remain in SILO]
    SAVED --> RESELECT[User reselects the same file]
    RESELECT --> STATUS[Browser retrieves session status]
    STATUS --> MISSING[API lists stored parts]
    MISSING --> RESUME[Send missing part numbers only]
    RESUME --> COMPLETE[Finish upload]
```

**Important distinctions:**

- Upload resume = continue sending missing file parts.
- Processing resume/retry = restart/recover FFmpeg processing from the **original video**, not from a partially encoded HLS segment.
- The existing legacy `/video/upload` endpoint still exists; the new web uploader uses `/video/upload-sessions`.

## 5. HTTP endpoints

All routes below are prefixed with `/api/v1/video`, and all require authentication.

| Method | Route                                           | Purpose            |
| ------ | ----------------------------------------------- | ------------------ |
| POST   | `/upload-sessions`                              | Start an upload    |
| GET    | `/upload-sessions/:sessionId`                   | See uploaded parts |
| PUT    | `/upload-sessions/:sessionId/parts/:partNumber` | Send a part        |
| POST   | `/upload-sessions/:sessionId/complete`          | Finalize           |
| DELETE | `/upload-sessions/:sessionId`                   | Cancel             |

## 6. Verify manually

1. Upload a video larger than 8 MiB.
2. Pause halfway through; resume and verify progress continues.
3. Refresh, choose the exact same file again, and verify already uploaded parts are skipped.
4. Complete upload; observe video status move from `PENDING` to `READY` after worker finishes.

Related code: `apps/web/src/features/creator/api/multipart.api.ts`, `apps/api/src/services/multipart-upload.service.ts`.
