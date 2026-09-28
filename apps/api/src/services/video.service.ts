import { minioClient as storageClient } from '../lib/storage';
import { publishToQueue } from '../lib/rabbitmq';
import { prisma } from '../lib/prisma';

export class VideoService {
  async uploadAndEnqueueVideo(creatorId: string, title: string, file: Express.Multer.File) {
    const videoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rawObjectPath = `raw/${creatorId}/${videoId}_${file.originalname}`;

    // 1. Upload raw file to MinIO 'videos' bucket
    await storageClient.putObject('videos', rawObjectPath, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    // 2. Persist record in PostgreSQL
    const video = await prisma.video.create({
      data: {
        id: videoId,
        title,
        creatorId,
        status: 'PROCESSING',
        rawPath: rawObjectPath,
      },
    });

    // 3. Publish job to RabbitMQ queue
    await publishToQueue('video_processing_queue', {
      videoId,
      creatorId,
      rawPath: rawObjectPath,
    });

    return video;
  }

  async getHlsStreamUrl(videoId: string) {
    // Generate a 24-hour presigned URL for master playlist
    return await storageClient.presignedGetObject(
      'videos',
      `hls/${videoId}/master.m3u8`,
      24 * 60 * 60
    );
  }
}

export const videoService = new VideoService();