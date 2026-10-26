import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, redisMock } from '../__mocks__/infrastructure';
vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../lib/redis', () => ({ redis: redisMock }));
vi.mock('../lib/rabbitmq', () => ({ publishToQueue: vi.fn() }));
vi.mock('../lib/storage', () => ({ minioClient: {} }));
import { VideoService } from './video.service';
import { publishToQueue } from '../lib/rabbitmq';

const video = {
  id: 'vid_123', creatorId: 'creator-a', status: 'PROCESSING',
  processingJobId: 'old-job', processingAttempts: 1,
  rawPath: 'raw/creator-a/vid_123.mp4',
  processingLeaseUntil: new Date(Date.now() - 60_000),
  updatedAt: new Date(Date.now() - 200_000),
};

describe('Manually resume an interrupted processing job', () => {
  beforeEach(() => { vi.clearAllMocks(); redisMock.del.mockResolvedValue(1); });

  it('rejects a different creator without changing the job', async () => {
    prismaMock.video.findUnique.mockResolvedValue({ ...video });
    await expect(new VideoService().resumeStalledProcessing(video.id, 'creator-b'))
      .rejects.toThrow('Unauthorized');
    expect(prismaMock.video.updateMany).not.toHaveBeenCalled();
  });

  it('rejects jobs with an unexpired processing lease', async () => {
    prismaMock.video.findUnique.mockResolvedValue({ ...video, processingLeaseUntil: new Date(Date.now() + 60_000) });
    await expect(new VideoService().resumeStalledProcessing(video.id, video.creatorId))
      .rejects.toThrow('Conflict');
    expect(publishToQueue).not.toHaveBeenCalled();
  });

  it('atomically starts a new job only after the old lease expires', async () => {
    prismaMock.video.findUnique.mockResolvedValue({ ...video });
    prismaMock.video.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.video.findUniqueOrThrow.mockResolvedValue({ ...video, status: 'PENDING' });
    await new VideoService().resumeStalledProcessing(video.id, video.creatorId);
    expect(prismaMock.video.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ creatorId: video.creatorId, status: 'PROCESSING' }),
      data: expect.objectContaining({ status: 'PENDING', processingAttempts: 0, processingJobId: expect.any(String) }),
    }));
    expect(publishToQueue).toHaveBeenCalledWith('video_processing_queue', expect.objectContaining({ videoId: video.id, attempt: 1 }));
  });
});
