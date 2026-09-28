import path from 'path';
import fs from 'fs-extra';
import ffmpeg from 'fluent-ffmpeg';
import { env } from '../config/env.config';
import { storageClient, uploadFolderToMinio, ensureBucketExists } from '../lib/storage';
import { prisma } from '../lib/prisma'; 
import { logger } from '../lib/logger';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Get the resolved binary path safely
const ffmpegExecutablePath = ffmpegInstaller.path || (ffmpegInstaller as any).default?.path;

if (ffmpegExecutablePath) {
  ffmpeg.setFfmpegPath(ffmpegExecutablePath);
} else {
  console.error('Failed to locate FFmpeg binary path from @ffmpeg-installer/ffmpeg');
}

interface TranscodeJobData {
  videoId: string;
  rawPath: string;
}

/**
 * Downloads raw video from MinIO, transcodes it to HLS multi-bitrate streams,
 * uploads HLS outputs back to MinIO, and updates database records.
 */
export async function processTranscodeJob(jobData: TranscodeJobData): Promise<void> {
  const { videoId, rawPath } = jobData;
  const bucketName = 'videos';

  // Base working directory for this video job inside temp folder
  const workDir = path.join(env.FFMPEG_TEMP_DIR, videoId);
  const rawInputPath = path.join(workDir, 'raw-input.mp4');
  const hlsOutputDir = path.join(workDir, 'hls');

  try {
    logger.info({ videoId, rawPath }, 'Starting video transcoding job');

    // 1. Create temporary working directories
    await fs.ensureDir(workDir);
    await fs.ensureDir(hlsOutputDir);

    // 2. Ensure MinIO target bucket exists
    await ensureBucketExists(bucketName);

    // 3. Download raw video from MinIO to local temp directory
    logger.info({ videoId, rawPath }, 'Downloading raw video from MinIO');
    await storageClient.fGetObject(bucketName, rawPath, rawInputPath);

    // 4. Update status to PROCESSING in database
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' },
    });

    // 5. Transcode raw video to HLS using FFmpeg
    logger.info({ videoId }, 'Transcoding video into HLS streams');
    const masterPlaylistPath = path.join(hlsOutputDir, 'master.m3u8');

    await new Promise<void>((resolve, reject) => {
      ffmpeg(rawInputPath)
        .outputOptions([
          '-preset veryfast',
          '-g 48',
          '-sc_threshold 0',
          // HLS Master Playlist Configuration
          '-f hls',
          '-hls_time 6',
          '-hls_playlist_type vod',
          '-hls_segment_filename',
          path.join(hlsOutputDir, 'segment_%v_%03d.ts'),
          '-master_pl_name master.m3u8',
          // Quality Variants (720p and 480p)
          '-map 0:v:0',
          '-map 0:a:0?',
          '-map 0:v:0',
          '-map 0:a:0?',
          '-s:v:0 1280x720',
          '-c:v:0 libx264',
          '-b:v:0 2800k',
          '-s:v:1 854x480',
          '-c:v:1 libx264',
          '-b:v:1 1400k',
          '-c:a copy',
          '-var_stream_map',
          'v:0,a:0? v:1,a:1?',
        ])
        .output(path.join(hlsOutputDir, 'p_%v.m3u8'))
        .on('start', (cmd) => {
          logger.debug({ cmd }, 'FFmpeg process started');
        })
        .on('end', () => {
          logger.info({ videoId }, 'FFmpeg transcoding complete');
          resolve();
        })
        .on('error', (err) => {
          logger.error({ err, videoId }, 'FFmpeg process failed');
          reject(err);
        })
        .run();
    });

    // 6. Upload generated HLS files (master playlist & segments) back to MinIO
    const targetMinioPrefix = `hls/${videoId}`;
    logger.info({ videoId, targetMinioPrefix }, 'Uploading HLS files to MinIO');
    await uploadFolderToMinio(bucketName, targetMinioPrefix, hlsOutputDir);

    // 7. Update status to READY in database
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'READY' },
    });

    logger.info({ videoId }, 'Transcoding job completed successfully');
  } catch (error) {
    logger.error({ error, videoId }, `Transcoding failure for ${videoId}`);

    // Update database status to FAILED
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'FAILED' },
    });

    throw error;
  } finally {
    // 8. Safe recursive directory cleanup (uses fs.remove to avoid ENOTEMPTY error)
    try {
      if (await fs.pathExists(workDir)) {
        await fs.remove(workDir);
        logger.info({ workDir }, 'Cleaned up local temporary working directory');
      }
    } catch (cleanupError) {
      logger.error({ cleanupError, workDir }, 'Failed to clean up temporary directory');
    }
  }
}