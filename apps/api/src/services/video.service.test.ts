import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Load infrastructure mocks FIRST
import { prismaMock } from '../__mocks__/infrastructure';

// Mock the internal prisma client module used by video.service.ts
vi.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}));

// 2. Mock external libraries & utilities
vi.mock('../lib/storage', () => ({
  minioClient: {
    putObject: vi.fn(),
    presignedGetObject: vi.fn(),
    removeObject: vi.fn(),
    removeObjects: vi.fn(),
    listObjectsV2: vi.fn(),
  },
}));

vi.mock('../lib/rabbitmq', () => ({
  publishToQueue: vi.fn(),
}));

// 3. Import service & mocked modules AFTER mocks are registered
import { VideoService, videoService } from './video.service';
import { minioClient as storageClient } from '../lib/storage';
import { publishToQueue } from '../lib/rabbitmq';

describe('VideoService Unit Tests', () => {
  let instance: VideoService;

  beforeEach(() => {
    vi.clearAllMocks();
    instance = new VideoService();
  });

  describe('uploadAndEnqueueVideo', () => {
    it('should successfully upload raw file to MinIO, create DB record, and publish job to RabbitMQ', async () => {
      const creatorId = 'usr_creator_123';
      const title = 'Test Video Title';
      const mockFile = {
        originalname: 'sample.mp4',
        buffer: Buffer.from('dummy-video-content'),
        size: 1024,
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      vi.mocked(storageClient.putObject).mockResolvedValue({ etag: 'etag123', versionId: null });
      prismaMock.video.create.mockImplementation(async (args) => ({
        id: args.data.id,
        title: args.data.title,
        status: args.data.status,
        rawPath: args.data.rawPath,
        creatorId: args.data.creatorId,
        thumbnailPath: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as never);
      vi.mocked(publishToQueue).mockResolvedValue(true as never);

      const result = await instance.uploadAndEnqueueVideo(creatorId, title, mockFile);

      expect(storageClient.putObject).toHaveBeenCalledWith(
        'videos',
        expect.stringMatching(new RegExp(`^raw/${creatorId}/vid_.*_sample\\.mp4$`)),
        mockFile.buffer,
        mockFile.size,
        { 'Content-Type': 'video/mp4' }
      );

      expect(prismaMock.video.create).toHaveBeenCalledWith({
        data: {
          id: expect.stringMatching(/^vid_/),
          title,
          creatorId,
          status: 'PENDING',
          rawPath: expect.stringMatching(new RegExp(`^raw/${creatorId}/vid_.*_sample\\.mp4$`)),
        },
      });

      expect(publishToQueue).toHaveBeenCalledWith('video_processing_queue', {
        videoId: result.id,
        creatorId,
        rawPath: result.rawPath,
      });

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('PENDING');
      expect(result.title).toBe(title);
    });
  });

  describe('getHlsStreamUrl', () => {
    it('should return a presigned URL for master playlist with 24-hour expiration', async () => {
      const videoId = 'vid_12345';
      const mockPresignedUrl = 'https://minio.local/videos/hls/vid_12345/master.m3u8?token=abc';
      vi.mocked(storageClient.presignedGetObject).mockResolvedValue(mockPresignedUrl);

      const result = await instance.getHlsStreamUrl(videoId);

      expect(storageClient.presignedGetObject).toHaveBeenCalledWith(
        'videos',
        `hls/${videoId}/master.m3u8`,
        86400
      );
      expect(result).toBe(mockPresignedUrl);
    });
  });

  describe('getThumbnailUrl', () => {
    it('should return presigned URL when video and thumbnailPath exist', async () => {
      const videoId = 'vid_12345';
      const mockThumbnailPath = 'thumbnails/vid_12345.png';
      const mockPresignedUrl = 'https://minio.local/videos/thumbnails/vid_12345.png?token=abc';

      prismaMock.video.findUnique.mockResolvedValue({
        id: videoId,
        thumbnailPath: mockThumbnailPath,
      } as never);
      vi.mocked(storageClient.presignedGetObject).mockResolvedValue(mockPresignedUrl);

      const result = await instance.getThumbnailUrl(videoId);

      expect(prismaMock.video.findUnique).toHaveBeenCalledWith({ where: { id: videoId } });
      expect(storageClient.presignedGetObject).toHaveBeenCalledWith('videos', mockThumbnailPath, 86400);
      expect(result).toBe(mockPresignedUrl);
    });

    it('should return null if video record is not found', async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      const result = await instance.getThumbnailUrl('non_existent_id');

      expect(result).toBeNull();
      expect(storageClient.presignedGetObject).not.toHaveBeenCalled();
    });

    it('should return null if video exists but thumbnailPath is null', async () => {
      prismaMock.video.findUnique.mockResolvedValue({
        id: 'vid_12345',
        thumbnailPath: null,
      } as never);

      const result = await instance.getThumbnailUrl('vid_12345');

      expect(result).toBeNull();
      expect(storageClient.presignedGetObject).not.toHaveBeenCalled();
    });
  });

  describe('getVideosByCreatorId', () => {
    it('should retrieve ordered list of video records for a specific creator', async () => {
      const creatorId = 'usr_creator_123';
      const mockVideos = [
        { id: 'vid_1', title: 'Video 1', status: 'READY' },
        { id: 'vid_2', title: 'Video 2', status: 'PENDING' },
      ];

      prismaMock.video.findMany.mockResolvedValue(mockVideos as never);

      const result = await instance.getVideosByCreatorId(creatorId);

      expect(prismaMock.video.findMany).toHaveBeenCalledWith({
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
      expect(result).toEqual(mockVideos);
    });
  });

  describe('retryVideoProcessing', () => {
    const videoId = 'vid_retry_123';
    const creatorId = 'usr_creator_123';
    const rawPath = 'raw/usr_creator_123/vid_retry_123_video.mp4';

    it('should successfully update status to PENDING and republish job', async () => {
      prismaMock.video.findUnique.mockResolvedValue({
        id: videoId,
        creatorId,
        rawPath,
        status: 'FAILED',
      } as never);

      prismaMock.video.update.mockResolvedValue({
        id: videoId,
        creatorId,
        rawPath,
        status: 'PENDING',
      } as never);

      vi.mocked(publishToQueue).mockResolvedValue(true as never);

      const result = await instance.retryVideoProcessing(videoId, creatorId);

      expect(prismaMock.video.findUnique).toHaveBeenCalledWith({ where: { id: videoId } });
      expect(prismaMock.video.update).toHaveBeenCalledWith({
        where: { id: videoId },
        data: { status: 'PENDING' },
      });
      expect(publishToQueue).toHaveBeenCalledWith('video_processing_queue', {
        videoId,
        creatorId,
        rawPath,
      });
      expect(result.status).toBe('PENDING');
    });

    it('should throw error if video does not exist', async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      await expect(instance.retryVideoProcessing('invalid_id', creatorId)).rejects.toThrow('Video not found');
      expect(prismaMock.video.update).not.toHaveBeenCalled();
      expect(publishToQueue).not.toHaveBeenCalled();
    });

    it('should throw error if creatorId does not match video owner', async () => {
      prismaMock.video.findUnique.mockResolvedValue({
        id: videoId,
        creatorId: 'different_creator',
        rawPath,
      } as never);

      await expect(instance.retryVideoProcessing(videoId, creatorId)).rejects.toThrow(
        'Unauthorized: You can only retry processing for your own videos'
      );
      expect(prismaMock.video.update).not.toHaveBeenCalled();
    });

    it('should throw error if rawPath is missing', async () => {
      prismaMock.video.findUnique.mockResolvedValue({
        id: videoId,
        creatorId,
        rawPath: null,
      } as never);

      await expect(instance.retryVideoProcessing(videoId, creatorId)).rejects.toThrow(
        'Cannot retry processing: Raw video file path is missing'
      );
      expect(prismaMock.video.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteVideo', () => {
    const videoId = 'vid_del_123';
    const creatorId = 'usr_creator_123';
    const mockVideo = {
      id: videoId,
      creatorId,
      rawPath: 'raw/usr_creator_123/vid_del_123.mp4',
      thumbnailPath: 'thumbnails/vid_del_123.png',
    };

    async function* createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
      for (const item of items) {
        yield item;
      }
    }

    it('should delete raw file, thumbnail, HLS folder, and DB record successfully', async () => {
      prismaMock.video.findUnique.mockResolvedValue(mockVideo as never);
      vi.mocked(storageClient.removeObject).mockResolvedValue(undefined as never);

      const hlsFiles = [{ name: 'hls/vid_del_123/master.m3u8' }, { name: 'hls/vid_del_123/720p.ts' }];
      vi.mocked(storageClient.listObjectsV2).mockReturnValue(createAsyncIterable(hlsFiles) as never);
      vi.mocked(storageClient.removeObjects).mockResolvedValue(undefined as never);
      prismaMock.video.delete.mockResolvedValue(mockVideo as never);

      const result = await instance.deleteVideo(videoId, creatorId);

      expect(prismaMock.video.findUnique).toHaveBeenCalledWith({ where: { id: videoId } });
      expect(storageClient.removeObject).toHaveBeenCalledWith('videos', mockVideo.rawPath);
      expect(storageClient.removeObject).toHaveBeenCalledWith('videos', mockVideo.thumbnailPath);
      expect(storageClient.listObjectsV2).toHaveBeenCalledWith('videos', `hls/${videoId}/`, true);
      expect(storageClient.removeObjects).toHaveBeenCalledWith('videos', [
        'hls/vid_del_123/master.m3u8',
        'hls/vid_del_123/720p.ts',
      ]);
      expect(prismaMock.video.delete).toHaveBeenCalledWith({ where: { id: videoId } });
      expect(result).toEqual({ success: true });
    });

    it('should gracefully handle MinIO errors when deleting raw, thumbnail, or HLS objects', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      prismaMock.video.findUnique.mockResolvedValue(mockVideo as never);
      vi.mocked(storageClient.removeObject).mockRejectedValue(new Error('MinIO removal error'));
      vi.mocked(storageClient.listObjectsV2).mockImplementation(() => {
        throw new Error('MinIO stream error');
      });
      prismaMock.video.delete.mockResolvedValue(mockVideo as never);

      const result = await instance.deleteVideo(videoId, creatorId);

      expect(prismaMock.video.delete).toHaveBeenCalledWith({ where: { id: videoId } });
      expect(result).toEqual({ success: true });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should throw error if video does not exist during deletion', async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      await expect(instance.deleteVideo('invalid_id', creatorId)).rejects.toThrow('Video not found');
      expect(prismaMock.video.delete).not.toHaveBeenCalled();
    });

    it('should throw error if creatorId does not match owner', async () => {
      prismaMock.video.findUnique.mockResolvedValue({
        ...mockVideo,
        creatorId: 'different_creator',
      } as never);

      await expect(instance.deleteVideo(videoId, creatorId)).rejects.toThrow(
        'Unauthorized: You can only delete your own videos'
      );
      expect(prismaMock.video.delete).not.toHaveBeenCalled();
    });
  });

  describe('Singleton Instance Export', () => {
    it('should export a default singleton instance of VideoService', () => {
      expect(videoService).toBeInstanceOf(VideoService);
    });
  });
});