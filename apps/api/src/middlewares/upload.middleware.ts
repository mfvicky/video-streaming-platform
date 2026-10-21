import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Multer streams uploads to local temporary disk instead of allocating 1 GB in V8 heap.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, _file, cb) => cb(null, `video-upload-${randomUUID()}.tmp`),
});

export const uploadVideoMiddleware = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  },
});
