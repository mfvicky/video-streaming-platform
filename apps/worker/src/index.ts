import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { prisma } from '@app/db';
import { storageClient, uploadFolderToMinio } from './lib/storage';
import { transcodeToHLS, extractThumbnail } from './services/ffmpeg.service';
import { probeVideo } from './services/ffprobe.service';
import { consumeQueue, publishRetry, publishDeadLetter } from './lib/rabbitmq';
import { updateProgress } from './lib/progress';
import { env } from './config/env.config';
import { logger } from './lib/logger';

export interface VideoProcessingPayload {
  videoId: string;
  rawPath: string;
  jobId: string;
  attempt: number;
}

const MAX_ATTEMPTS = 3; // Initial attempt + two delayed retries.
const LEASE_MS = 2 * 60 * 1000;
const HEARTBEAT_MS = 30_000;

/** Atomically claim a job. READY, FAILED, stale job IDs and ordinary duplicates never re-encode. */
async function claim(
  payload: VideoProcessingPayload,
): Promise<'claimed' | 'defer' | 'replay-next' | 'skip'> {
  const { videoId, jobId, rawPath } = payload;
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video || video.processingJobId !== jobId || video.rawPath !== rawPath)
    return 'skip';
  if (video.status === 'READY' || video.status === 'FAILED') return 'skip';
  if (
    video.status === 'PENDING' &&
    video.processingAttempts === payload.attempt &&
    payload.attempt < MAX_ATTEMPTS
  )
    return 'replay-next';
  if (
    video.status === 'PENDING' &&
    video.processingAttempts !== payload.attempt - 1
  )
    return 'skip';
  if (
    video.status === 'PROCESSING' &&
    video.processingAttempts !== payload.attempt
  )
    return 'skip';
  if (
    video.status === 'PROCESSING' &&
    video.processingLeaseUntil &&
    video.processingLeaseUntil > new Date()
  )
    return 'defer';
  const claimed = await prisma.video.updateMany({
    where: {
      id: videoId,
      processingJobId: jobId,
      OR: [
        { status: 'PENDING', processingAttempts: payload.attempt - 1 },
        {
          status: 'PROCESSING',
          processingAttempts: payload.attempt,
          processingLeaseUntil: { lt: new Date() },
        },
      ],
    },
    data: {
      status: 'PROCESSING',
      processingAttempts:
        video.status === 'PENDING' ? { increment: 1 } : undefined,
      processingLeaseUntil: new Date(Date.now() + LEASE_MS),
      processingError: null,
      processingStartedAt: video.status === 'PENDING' ? new Date() : undefined,
      processedAt: null,
    },
  });
  return claimed.count === 1 ? 'claimed' : 'skip';
}

async function processVideo(payload: VideoProcessingPayload): Promise<void> {
  const { videoId, rawPath, jobId } = payload;
  if (
    !videoId ||
    !rawPath ||
    !jobId ||
    !Number.isInteger(payload.attempt) ||
    payload.attempt < 1
  ) {
    await publishDeadLetter(payload, 'Invalid job payload');
    return;
  }
  const claimed = await claim(payload);
  if (claimed === 'skip') {
    logger.info({ videoId, jobId }, 'Skipping stale or duplicate job');
    return;
  }
  if (claimed === 'replay-next') {
    // Recover a retry publication interrupted between SQL update and broker confirm.
    await publishRetry({ ...payload, attempt: payload.attempt + 1 });
    return;
  }
  if (claimed === 'defer') {
    // A prior consumer might have crashed. Recheck once the lease can expire.
    await publishRetry(payload);
    return;
  }
  const attempt = payload.attempt;

  const tempRoot = process.env.FFMPEG_TEMP_DIR || os.tmpdir();

  let tempDir = '';

  try {
    await fs.ensureDir(tempRoot);

    tempDir = await fs.mkdtemp(path.join(tempRoot, 'video-worker-'));

    logger.info({ tempDir }, 'Worker temp directory created');
  } catch (err) {
    logger.error({ err, videoId }, 'Could not create worker temp directory');
    throw err;
  }

  const rawFilePath = path.join(tempDir, 'source_video.mp4');
  const hlsOutputDir = path.join(tempDir, 'hls');
  const thumbnailFilePath = path.join(tempDir, 'thumbnail.jpg');
  // While FFmpeg runs, renew the SQL lease. If a worker crashes, redeliveries
  // will be allowed to resume after approximately two minutes.
  const heartbeat = setInterval(() => {
    prisma.video
      .updateMany({
        where: { id: videoId, processingJobId: jobId, status: 'PROCESSING' },
        data: { processingLeaseUntil: new Date(Date.now() + LEASE_MS) },
      })
      .catch((err) =>
        logger.warn({ err, videoId }, 'Unable to renew processing lease'),
      );
  }, HEARTBEAT_MS);
  try {
    await updateProgress(
      videoId,
      jobId,
      'PROCESSING',
      5,
      'Downloading original',
      attempt,
    );
    await fs.ensureDir(hlsOutputDir);
    await storageClient.fGetObject(env.MINIO_BUCKET_NAME, rawPath, rawFilePath);

    await updateProgress(
      videoId,
      jobId,
      'PROCESSING',
      15,
      'Reading FFprobe metadata',
      attempt,
    );
    const metadata = await probeVideo(rawFilePath);
    await prisma.video.updateMany({
      where: { id: videoId, processingJobId: jobId, status: 'PROCESSING' },
      data: {
        durationSeconds: metadata.durationSeconds,
        width: metadata.width,
        height: metadata.height,
        videoCodec: metadata.videoCodec,
        fileSizeBytes: metadata.fileSizeBytes,
        bitrate: metadata.bitrate,
        audioChannels: metadata.audioChannels,
      },
    });

    await updateProgress(
      videoId,
      jobId,
      'PROCESSING',
      20,
      'Extracting thumbnail',
      attempt,
    );
    await extractThumbnail(rawFilePath, thumbnailFilePath);
    await transcodeToHLS(
      rawFilePath,
      hlsOutputDir,
      metadata,
      async (percent) => {
        await updateProgress(
          videoId,
          jobId,
          'PROCESSING',
          20 + Math.round(percent * 0.6),
          'Transcoding HLS',
          attempt,
        );
      },
    );

    await updateProgress(
      videoId,
      jobId,
      'PROCESSING',
      85,
      'Uploading thumbnail',
      attempt,
    );
    const thumbnailKey = `thumbnails/${videoId}/thumbnail.jpg`;
    await storageClient.fPutObject(
      env.MINIO_BUCKET_NAME,
      thumbnailKey,
      thumbnailFilePath,
      { 'Content-Type': 'image/jpeg' },
    );
    await updateProgress(
      videoId,
      jobId,
      'PROCESSING',
      90,
      'Uploading HLS files',
      attempt,
    );
    await uploadFolderToMinio(
      env.MINIO_BUCKET_NAME,
      `hls/${videoId}`,
      hlsOutputDir,
    );
    const changed = await prisma.video.updateMany({
      where: { id: videoId, processingJobId: jobId, status: 'PROCESSING' },
      data: {
        status: 'READY',
        thumbnailPath: thumbnailKey,
        processingLeaseUntil: null,
        processingError: null,
        processedAt: new Date(),
      },
    });
    if (changed.count === 1)
      await updateProgress(videoId, jobId, 'READY', 100, 'Complete', attempt);
    logger.info({ videoId, jobId }, 'HLS generation completed');
  } catch (err) {
    const reason =
      err instanceof Error ? err.message.slice(0, 1000) : String(err);
    logger.error({ err, videoId, attempt }, 'Video processing failed');
    if (attempt < MAX_ATTEMPTS) {
      await prisma.video.updateMany({
        where: { id: videoId, processingJobId: jobId, status: 'PROCESSING' },
        data: {
          status: 'PENDING',
          processingLeaseUntil: null,
          processingError: reason,
        },
      });
      await publishRetry({ ...payload, attempt: attempt + 1 });
      await updateProgress(
        videoId,
        jobId,
        'PENDING',
        0,
        `Retry scheduled (${attempt}/${MAX_ATTEMPTS})`,
        attempt,
        reason,
      );
    } else {
      await publishDeadLetter(payload, reason); // Wait for publisher confirm before ACK.
      await prisma.video.updateMany({
        where: { id: videoId, processingJobId: jobId, status: 'PROCESSING' },
        data: {
          status: 'FAILED',
          processingLeaseUntil: null,
          processingError: reason,
        },
      });
      await updateProgress(
        videoId,
        jobId,
        'FAILED',
        0,
        'Permanently failed',
        attempt,
        reason,
      );
    }
  } finally {
    clearInterval(heartbeat);
    await fs
      .remove(tempDir)
      .catch((err) =>
        logger.warn({ err, tempDir }, 'Worker temp cleanup failed'),
      );
  }
}

async function main() {
  logger.info('Worker active. Waiting for HLS tasks');
  await consumeQueue<VideoProcessingPayload>(async (payload, msg, channel) => {
    await processVideo(payload);
    channel.ack(msg);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Worker crashed');
  process.exitCode = 1;
});
