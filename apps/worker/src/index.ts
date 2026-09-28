import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import amqp from 'amqplib';
import fs from 'fs-extra';
import { prisma } from '@app/db';
import { storageClient, uploadFolderToMinio } from './lib/storage';
import { transcodeToHLS } from './services/ffmpeg.service';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ffmpegExecutablePath = ffmpegInstaller.path || (ffmpegInstaller as any).default?.path;
console.log('FFmpeg binary location:', ffmpegExecutablePath);

async function startWorker() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672');
  const channel = await connection.createChannel();
  const queue = 'video_processing_queue';

  await channel.assertQueue(queue, { durable: true });
  channel.prefetch(1);

  console.log('Worker active. Waiting for HLS encoding tasks...');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    // 1. Immediately ACK the message to prevent RabbitMQ consumer_timeout (PRECONDITION_FAILED 406)
    channel.ack(msg);

    const { videoId, rawPath } = JSON.parse(msg.content.toString());
    const tempDir = path.join(os.tmpdir(), 'video_worker', videoId);
    const rawFilePath = path.join(tempDir, 'source_video.mp4');
    const hlsOutputDir = path.join(tempDir, 'hls');

    try {
      // 2. Mark video status as PROCESSING in Database
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'PROCESSING' },
      });

      await fs.ensureDir(tempDir);
      await fs.ensureDir(hlsOutputDir);

      // 3. Download raw file from MinIO
      console.log(`Downloading ${rawPath} to local temp path...`);
      await storageClient.fGetObject('videos', rawPath, rawFilePath);

      // 4. Perform HLS Transcoding
      console.log(`Transcoding ${videoId} to HLS...`);
      await transcodeToHLS(rawFilePath, hlsOutputDir);

      // 5. Upload generated .m3u8 playlists & .ts chunks to MinIO
      console.log(`Uploading HLS files for ${videoId}...`);
      await uploadFolderToMinio('videos', `hls/${videoId}`, hlsOutputDir);

      // 6. Update status in PostgreSQL to READY
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'READY' },
      });

      console.log(`HLS Generation completed for ${videoId}`);
    } catch (error) {
      console.error(`Transcoding failure for ${videoId}:`, error);

      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'FAILED' },
      }).catch(() => {});
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