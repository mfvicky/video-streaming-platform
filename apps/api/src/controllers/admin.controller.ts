import type { Request, Response, NextFunction } from 'express';
import * as amqp from 'amqplib';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { minioClient } from '../lib/storage.js';
import { env } from '../config/env.js';
import { createVideoWhere } from '../services/video-filters.js';
import { videoService } from '../services/video.service.js';
import { logger } from '../lib/logger.js';

/** Always verify ADMIN against PostgreSQL; a previously issued JWT may be stale. */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN')
      return res
        .status(403)
        .json({ success: false, message: 'Admin access required' });
    next();
  } catch (error) {
    next(error);
  }
}

async function bucketSize(): Promise<number | null> {
  const key = 'admin:bucket:total-bytes:v1';
  try {
    const cached = await redis.get(key);
    if (cached !== null) return Number(cached);
  } catch {
    /* keep dashboard available */
  }
  try {
    let total = 0;
    for await (const item of minioClient.listObjectsV2(
      env.MINIO_BUCKET_NAME,
      '',
      true,
    )) {
      total += item.size ?? 0;
    }
    await redis.set(key, String(total), 'EX', 60).catch(() => {});
    return total;
  } catch (error) {
    logger.warn({ error }, 'Could not compute object-storage size');
    return null;
  }
}

async function queueDepths(): Promise<Record<string, number | null>> {
  const names = [
    env.QUEUE_NAME,
    `${env.QUEUE_NAME}.retry`,
    `${env.QUEUE_NAME}.dlq`,
  ];
  const result: Record<string, number | null> = Object.fromEntries(
    names.map((n) => [n, null]),
  );
  let connection: amqp.ChannelModel | undefined;
  try {
    connection = await amqp.connect(env.RABBITMQ_URL);
    for (const name of names) {
      const ch = await connection.createChannel();
      try {
        result[name] = (await ch.checkQueue(name)).messageCount;
      } catch {
        /* A non-existent queue closes its AMQP channel; unknown, not zero. */
      } finally {
        await ch.close().catch(() => {});
      }
    }
  } catch (error) {
    logger.warn({ error }, 'RabbitMQ queue metrics unavailable');
  } finally {
    await connection?.close().catch(() => {});
  }
  return result;
}

export async function getAdminMetrics(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const [groups, sums, avg, storedBytes, queues] = await Promise.all([
      prisma.video.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.video.aggregate({
        _count: { _all: true },
        _sum: { fileSizeBytes: true, viewCount: true, downloadCount: true },
      }),
      prisma.$queryRaw<
        Array<{ avgSeconds: number }>
      >`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("processedAt" - "processingStartedAt"))),0)::float8 AS "avgSeconds" FROM "Video" WHERE status = 'READY' AND "processedAt" IS NOT NULL AND "processingStartedAt" IS NOT NULL`,
      bucketSize(),
      queueDepths(),
    ]);
    const counts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      READY: 0,
      FAILED: 0,
    };
    for (const entry of groups) counts[entry.status] = entry._count._all;
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      success: true,
      data: {
        totalVideos: sums._count._all,
        counts,
        originalBytes: sums._sum.fileSizeBytes || 0,
        storedBytes, // sum of raw, HLS and thumbnail objects; null if MinIO unavailable
        totalViews: sums._sum.viewCount || 0,
        totalDownloads: sums._sum.downloadCount || 0,
        averageProcessingSeconds: avg[0]?.avgSeconds || 0,
        queues,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminVideos(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.min(10000, Math.max(1, Number(req.query.page) || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const where = createVideoWhere(req.query);
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          width: true,
          height: true,
          durationSeconds: true,
          fileSizeBytes: true,
          viewCount: true,
          downloadCount: true,
          processingAttempts: true,
          processingError: true,
          creator: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.video.count({ where }),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      success: true,
      data: videos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function adminRetryVideo(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const videoId = String(req.params.videoId || '');
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { creatorId: true },
    });
    if (!video)
      return res
        .status(404)
        .json({ success: false, message: 'Video not found' });
    const updated = await videoService.retryVideoProcessing(
      videoId,
      video.creatorId,
    );
    return res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Conflict:'))
      return res.status(409).json({ success: false, message: error.message });
    next(error);
  }
}
