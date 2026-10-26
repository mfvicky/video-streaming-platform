/** Resumable S3 multipart uploads. Never buffer an entire video in API memory. */
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import {
  S3Client, CreateMultipartUploadCommand, UploadPartCommand, ListPartsCommand,
  CompleteMultipartUploadCommand, AbortMultipartUploadCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { publishToQueue } from '../lib/rabbitmq.js';
import { logger } from '../lib/logger.js';

export const PART_SIZE = 8 * 1024 * 1024;
// Existing FFprobe metadata uses a Prisma Int (signed 32-bit).
export const MAX_FILE_BYTES = 2_147_483_647;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const BUCKET = env.MINIO_BUCKET_NAME;
const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: `${env.MINIO_USE_SSL ? 'https' : 'http'}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.MINIO_ACCESS_KEY, secretAccessKey: env.MINIO_SECRET_KEY },
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

export class UploadHttpError extends Error {
  constructor(public readonly code: number, message: string) { super(message); }
}
function assert(ok: unknown, code: number, message: string): asserts ok {
  if (!ok) throw new UploadHttpError(code, message);
}
const safeFileName = (name: string): string => name.split(/[/\\]/).pop()?.slice(0, 255) || 'video.mp4';
const accepted = (name: string, mime: string) =>
  /\.(mp4|mov|mkv|webm|avi)$/i.test(name) && (mime.startsWith('video/') || mime === 'application/octet-stream' || mime === 'application/x-matroska');

type Session = Awaited<ReturnType<typeof prisma.uploadSession.findUnique>>;
async function owned(sessionId: string, creatorId: string): Promise<NonNullable<Session>> {
  const record = await prisma.uploadSession.findUnique({ where: { id: sessionId } });
  if (!record || record.creatorId !== creatorId) throw new UploadHttpError(404, 'Upload session not found');
  if (record.status === 'ABORTED') throw new UploadHttpError(410, 'Upload was cancelled');
  if (record.status === 'OPEN' && record.expiresAt < new Date()) throw new UploadHttpError(410, 'Upload session expired');
  return record;
}

export async function initiateMultipart(creatorId: string, title: string, filename: string, contentType: string, fileSize: number) {
  assert(typeof title === 'string' && title.trim().length > 0 && title.length <= 200, 400, 'Title must be 1–200 characters');
  assert(typeof filename === 'string' && filename.length > 0 && filename.length <= 255, 400, 'Invalid file name');
  assert(typeof contentType === 'string', 400, 'Invalid content type');
  assert(Number.isSafeInteger(fileSize) && fileSize > 0 && fileSize <= MAX_FILE_BYTES, 400, 'Invalid file size (maximum 2 GiB minus 1 byte)');
  filename = safeFileName(filename);
  assert(accepted(filename, contentType), 400, 'Unsupported video format');
  const videoId = `vid_${Date.now()}_${randomUUID().slice(0, 7)}`;
  const rawPath = `raw/${creatorId}/${videoId}${filename.slice(filename.lastIndexOf('.')).toLowerCase()}`;
  const initiated = await s3.send(new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: rawPath, ContentType: contentType }));
  assert(initiated.UploadId, 502, 'Object storage did not return an upload ID');
  try {
    const record = await prisma.uploadSession.create({ data: {
      creatorId, videoId, title: title.trim(), fileName: filename, fileSize, contentType,
      rawPath, storageUploadId: initiated.UploadId!, expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    } });
    return { sessionId: record.id, videoId, partSize: PART_SIZE, fileSize, status: 'OPEN', parts: [] };
  } catch (error) {
    await s3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: rawPath, UploadId: initiated.UploadId })).catch(() => {});
    throw error;
  }
}

async function allParts(record: NonNullable<Session>) {
  const parts: Array<{ partNumber: number; etag: string; size: number }> = [];
  let marker: string | undefined;
  do {
    const page = await s3.send(new ListPartsCommand({
      Bucket: BUCKET, Key: record.rawPath, UploadId: record.storageUploadId,
      PartNumberMarker: marker,
    }));
    for (const part of page.Parts || []) {
      if (part.PartNumber && part.ETag && part.Size != null) parts.push({ partNumber: part.PartNumber, etag: part.ETag, size: part.Size });
    }
    marker = page.IsTruncated ? page.NextPartNumberMarker : undefined;
  } while (marker);
  return parts.sort((a, b) => a.partNumber - b.partNumber);
}

export async function getMultipartStatus(sessionId: string, creatorId: string) {
  const record = await owned(sessionId, creatorId);
  return { sessionId: record.id, status: record.status, videoId: record.videoId, fileName: record.fileName,
    fileSize: record.fileSize, partSize: PART_SIZE, parts: record.status === 'OPEN' ? await allParts(record) : [] };
}

export async function putMultipartPart(sessionId: string, creatorId: string, partNumber: number, req: Request) {
  const record = await owned(sessionId, creatorId);
  assert(record.status === 'OPEN', 409, 'Session is no longer accepting parts');
  const total = Math.ceil(record.fileSize / PART_SIZE);
  assert(Number.isInteger(partNumber) && partNumber >= 1 && partNumber <= total, 400, 'Invalid part number');
  const expected = Math.min(PART_SIZE, record.fileSize - (partNumber - 1) * PART_SIZE);
  assert(req.headers['content-type']?.split(';')[0] === 'application/octet-stream', 415, 'Expected application/octet-stream');
  assert(Number(req.headers['content-length']) === expected, 400, `Part must contain ${expected} bytes`);
  // The raw IncomingMessage is a stream: no multer or full-video buffers involved.
  const uploaded = await s3.send(new UploadPartCommand({
    Bucket: BUCKET, Key: record.rawPath, UploadId: record.storageUploadId,
    PartNumber: partNumber, Body: req, ContentLength: expected,
  }));
  assert(uploaded.ETag, 502, 'Object storage did not confirm chunk');
  return { partNumber, etag: uploaded.ETag };
}

async function objectCompleted(record: NonNullable<Session>): Promise<boolean> {
  try {
    const object = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: record.rawPath }));
    return object.ContentLength === record.fileSize;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && ('$metadata' in error) &&
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

export async function completeMultipart(sessionId: string, creatorId: string) {
  const record = await owned(sessionId, creatorId);
  if (record.status === 'COMPLETED') return { videoId: record.videoId };
  if (record.status === 'FINALIZING' && Date.now() - record.updatedAt.getTime() < 120_000) {
    throw new UploadHttpError(409, 'Finalization is already underway. Retry shortly.');
  }
  assert(record.status === 'OPEN' || record.status === 'FINALIZING', 409, 'Upload not ready for completion');
  const claim = await prisma.uploadSession.updateMany({
    where: { id: record.id, creatorId, status: record.status, updatedAt: record.updatedAt },
    data: { status: 'FINALIZING' },
  });
  assert(claim.count === 1, 409, 'Another request is completing this upload');
  try {
    if (!(await objectCompleted(record))) {
      const parts = await allParts(record);
      const expectedCount = Math.ceil(record.fileSize / PART_SIZE);
      assert(parts.length === expectedCount, 409, 'Not all chunks have been uploaded');
      for (let index = 0; index < expectedCount; index++) {
        assert(parts[index].partNumber === index + 1, 409, 'Missing chunk');
        assert(parts[index].size === Math.min(PART_SIZE, record.fileSize - index * PART_SIZE), 409, 'Incorrect chunk size');
      }
      await s3.send(new CompleteMultipartUploadCommand({ Bucket: BUCKET, Key: record.rawPath, UploadId: record.storageUploadId,
        MultipartUpload: { Parts: parts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag })) },
      }));
    }
    const jobId = randomUUID();
    // Idempotent create allows safe recovery after a crash between S3 completion and broker publish.
    const existing = await prisma.video.findUnique({ where: { id: record.videoId } });
    if (!existing) await prisma.video.create({ data: {
      id: record.videoId, creatorId, title: record.title, rawPath: record.rawPath,
      status: 'PENDING', processingJobId: jobId,
    } });
    const video = await prisma.video.findUniqueOrThrow({ where: { id: record.videoId } });
    // If the crash happened AFTER publish but BEFORE marking complete, a duplicate is harmless: worker is idempotent.
    if (video.status === 'PENDING') {
      await publishToQueue(env.QUEUE_NAME, { videoId: record.videoId, creatorId, rawPath: record.rawPath,
        jobId: video.processingJobId, attempt: 1 });
    }
    await prisma.uploadSession.update({ where: { id: record.id }, data: { status: 'COMPLETED' } });
    return { videoId: record.videoId };
  } catch (error) {
    // Open sessions can retry completion; completed objects remain stored in MinIO.
    await prisma.uploadSession.updateMany({ where: { id: record.id, status: 'FINALIZING' }, data: { status: 'OPEN' } });
    throw error;
  }
}

export async function cancelMultipart(sessionId: string, creatorId: string) {
  const record = await owned(sessionId, creatorId);
  assert(record.status === 'OPEN', 409, 'Cannot cancel a finalized upload');
  await prisma.uploadSession.updateMany({ where: { id: record.id, status: 'OPEN' }, data: { status: 'ABORTED' } });
  await s3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: record.rawPath, UploadId: record.storageUploadId }));
}

/** Periodically reclaim abandoned parts. Safe with multiple API replicas. */
export async function purgeExpiredMultipartSessions() {
  const expired = await prisma.uploadSession.findMany({ where: { status: 'OPEN', expiresAt: { lt: new Date() } }, take: 100 });
  for (const record of expired) {
    const changed = await prisma.uploadSession.updateMany({ where: { id: record.id, status: 'OPEN' }, data: { status: 'ABORTED' } });
    if (changed.count) await s3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: record.rawPath, UploadId: record.storageUploadId }))
      .catch(error => logger.warn({ error, uploadSessionId: record.id }, 'Unable to abort expired multipart upload'));
  }
  // Keep completed sessions briefly to support retries after lost HTTP responses.
  await prisma.uploadSession.deleteMany({
    where: { status: { in: ['COMPLETED', 'ABORTED'] }, updatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });
}
