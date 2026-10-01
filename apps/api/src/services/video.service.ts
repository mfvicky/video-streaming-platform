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
        status: 'PENDING',
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

  async getThumbnailUrl(videoId: string) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video || !video.thumbnailPath) {
      return null;
    }

    return await storageClient.presignedGetObject(
      'videos',
      video.thumbnailPath,
      24 * 60 * 60
    );
  }

  async getVideosByCreatorId(creatorId: string) {
    return await prisma.video.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        rawPath: true,
        thumbnailPath: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async retryVideoProcessing(videoId: string, creatorId: string) {
    // 1. Ensure the video exists and belongs to the requesting creator
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error('Video not found');
    }

    if (video.creatorId !== creatorId) {
      throw new Error('Unauthorized: You can only retry processing for your own videos');
    }

    if (!video.rawPath) {
      throw new Error('Cannot retry processing: Raw video file path is missing');
    }

    // 2. Reset video status to PENDING and reset progress
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'PENDING'
      },
    });

    // 3. Re-publish processing job to RabbitMQ queue
    await publishToQueue('video_processing_queue', {
      videoId: video.id,
      creatorId: video.creatorId,
      rawPath: video.rawPath,
    });

    return updatedVideo;
  }

  async deleteVideo(videoId: string, creatorId: string) {
    // 1. Fetch video record to confirm ownership and retrieve object paths
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error('Video not found');
    }

    if (video.creatorId !== creatorId) {
      throw new Error('Unauthorized: You can only delete your own videos');
    }

    const bucketName = 'videos';

    // 2. Remove raw file from MinIO if present
    if (video.rawPath) {
      try {
        await storageClient.removeObject(bucketName, video.rawPath);
      } catch (err) {
        console.error(`Failed to remove raw file ${video.rawPath} from MinIO:`, err);
      }
    }

    // 3. Remove thumbnail file from MinIO if present
    if (video.thumbnailPath) {
      try {
        await storageClient.removeObject(bucketName, video.thumbnailPath);
      } catch (err) {
        console.error(`Failed to remove thumbnail ${video.thumbnailPath} from MinIO:`, err);
      }
    }

    // 4. Remove generated HLS files folder (hls/{videoId}/*) from MinIO
    try {
      const hlsPrefix = `hls/${videoId}/`;
      const objectsStream = storageClient.listObjectsV2(bucketName, hlsPrefix, true);
      const objectsToDelete: string[] = [];

      for await (const obj of objectsStream) {
        if (obj.name) {
          objectsToDelete.push(obj.name);
        }
      }

      if (objectsToDelete.length > 0) {
        await storageClient.removeObjects(bucketName, objectsToDelete);
      }
    } catch (err) {
      console.error(`Failed to remove HLS folder for video ${videoId} from MinIO:`, err);
    }

    // 5. Delete video record from PostgreSQL database
    await prisma.video.delete({
      where: { id: videoId },
    });

    return { success: true };
  }

}


export const videoService = new VideoService();