import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { prisma } from '@app/db';
import { storageClient, uploadFolderToMinio } from './lib/storage';
import { transcodeToHLS, extractThumbnail } from './services/ffmpeg.service';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { consumeQueue } from './lib/rabbitmq';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ffmpegExecutablePath = ffmpegInstaller.path || (ffmpegInstaller as any).default?.path;
console.log('FFmpeg binary location:', ffmpegExecutablePath);

interface VideoProcessingPayload {
  videoId: string;
  rawPath: string;
}

async function startWorker() {
  console.log('Worker active. Waiting for HLS encoding tasks...');

  await consumeQueue<VideoProcessingPayload>(async (payload, msg, channel) => {
    const { videoId, rawPath } = payload;
    const tempDir = path.join(os.tmpdir(), 'video_worker', videoId);
    const rawFilePath = path.join(tempDir, 'source_video.mp4');
    const hlsOutputDir = path.join(tempDir, 'hls');
    const thumbnailFilePath = path.join(tempDir, 'thumbnail.jpg');

    try {
      // 1. Mark status as PROCESSING
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'PROCESSING' },
      });

      await fs.ensureDir(tempDir);
      await fs.ensureDir(hlsOutputDir);

      // 2. Download raw file from MinIO
      console.log(`Downloading ${rawPath} to local temp path...`);
      await storageClient.fGetObject('videos', rawPath, rawFilePath);

      // 3. Extract Thumbnail frame from input video
      console.log(`Extracting thumbnail for ${videoId}...`);
      await extractThumbnail(rawFilePath, thumbnailFilePath);

      // 4. Perform HLS Transcoding (Awaited)
      console.log(`Transcoding ${videoId} to HLS...`);
      await transcodeToHLS(rawFilePath, hlsOutputDir);

      // 5. Upload generated thumbnail frame to MinIO
      const thumbnailMinioKey = `thumbnails/${videoId}/thumbnail.jpg`;
      console.log(`Uploading thumbnail for ${videoId}...`);
      await storageClient.fPutObject('videos', thumbnailMinioKey, thumbnailFilePath, {
        'Content-Type': 'image/jpeg',
      });

      // 6. Upload generated .m3u8 playlists & .ts chunks to MinIO
      console.log(`Uploading HLS files for ${videoId}...`);
      await uploadFolderToMinio('videos', `hls/${videoId}`, hlsOutputDir);

      // 7. Update status in PostgreSQL to READY with thumbnailPath
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'READY',
          thumbnailPath: thumbnailMinioKey,
        },
      });

      console.log(`HLS Generation completed for ${videoId}`);

      // ACK ONLY AFTER COMPLETE JOB FINISHES
      channel.ack(msg);
    } catch (error) {
      console.error(`Transcoding failure for ${videoId}:`, error);

      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'FAILED' },
      }).catch(() => {});

      // NACK to remove from unacknowledged state (requeue: false prevents infinite retries)
      channel.nack(msg, false, false);
    } finally {
      // Safely cleanup temp folder
      try {
        await fs.remove(tempDir);
      } catch (cleanupError) {
        console.error(`Failed to clean directory ${tempDir}:`, cleanupError);
      }
    }
  });
}

startWorker();