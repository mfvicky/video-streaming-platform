# Web App (`apps/web`)

**Purpose:** React/Vite user interface for uploads, gallery, playback and admin metrics.

## Main user journey

1. Sign in / register.
2. Select one or multiple videos for upload.
3. Watch multipart upload progress (pause/resume where available).
4. See video status (`PENDING`, `PROCESSING`, `READY`, `FAILED`).
5. Browse, search and filter videos.
6. Play READY videos through Hls.js.
7. Download originals as owner/admin, or delete your own videos.
8. Admin users can access a broader dashboard.

## How streaming works

The worker produces `master.m3u8`, variant playlists and `.ts` segments. Hls.js loads available levels; the API exposes READY HLS assets without making the original bucket public.

## Run

```bash
# Full Docker stack: http://localhost:3001
docker compose up -d web

# Local Vite dev server: typically http://localhost:5173
corepack pnpm run dev:web
```

The Docker web container serves built static files through Nginx. Rebuild the `web` image after frontend source changes.

Related: [Multipart Upload](../architecture/multipart-upload.md) and [Analytics](../architecture/analytics.md).
