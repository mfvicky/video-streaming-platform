import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { minioClient } from '../lib/storage.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/** Only a play event (not a manifest/segment download) counts as a view.
 * One view per tab session/video per 30 minutes. Counts are approximate,
 * not fraud-resistant; server-side rate limiting still applies. */
export async function recordVideoView(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const videoId = String(req.params.videoId || '');
    const sessionId =
      typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
    if (!/^[0-9a-f-]{36}$/i.test(sessionId))
      return res
        .status(400)
        .json({ success: false, message: 'Invalid view session' });
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { status: true },
    });
    if (!video || video.status !== 'READY')
      return res
        .status(404)
        .json({ success: false, message: 'Video not available' });
    const key = `video:view:${videoId}:${sessionId}`;
    const first = await redis.set(key, '1', 'EX', 1800, 'NX');
    if (first === 'OK') {
      try {
        await prisma.video.update({
          where: { id: videoId },
          data: { viewCount: { increment: 1 } },
        });
      } catch (error) {
        await redis.del(key).catch(() => {});
        throw error;
      }
    }
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/** Create a short-lived, single-use download ticket so the browser can stream
 * multi-GB originals directly; no Blob buffering or browser-visible raw S3 URL. */
export async function issueDownloadTicket(
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
    if (video.creatorId !== req.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { role: true },
      });
      if (user?.role !== 'ADMIN')
        return res
          .status(403)
          .json({ success: false, message: 'Not your video' });
    }
    const ticket = randomBytes(32).toString('hex');
    await redis.set(`video:download-ticket:${ticket}`, videoId, 'EX', 60);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      success: true,
      url: `${req.protocol}://${req.get('host')}/api/v1/video/${encodeURIComponent(videoId)}/download?ticket=${ticket}`,
    });
  } catch (error) {
    next(error);
  }
}

/** Anyone without a valid one-use ticket gets 401. Original objects remain private. */
export async function downloadOriginalVideo(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const videoId = String(req.params.videoId || '');
    const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : '';
    if (!/^[a-f0-9]{64}$/.test(ticket))
      return res
        .status(401)
        .json({ success: false, message: 'Download authorization required' });
    const authorizedVideo = await redis.getdel(
      `video:download-ticket:${ticket}`,
    );
    if (authorizedVideo !== videoId)
      return res
        .status(401)
        .json({ success: false, message: 'Expired or used download ticket' });
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { rawPath: true, title: true },
    });
    if (!video)
      return res
        .status(404)
        .json({ success: false, message: 'Video not found' });
    const stat = await minioClient.statObject(
      env.MINIO_BUCKET_NAME,
      video.rawPath,
    );
    const extension = /\.[a-z0-9]{1,8}$/i.exec(video.rawPath)?.[0] || '.mp4';
    const safeName =
      (video.title
        .replace(/[^a-z0-9 _.-]/gi, '_')
        .slice(0, 100)
        .trim() || 'video') + extension;
    const stream = await minioClient.getObject(
      env.MINIO_BUCKET_NAME,
      video.rawPath,
    );
    res.setHeader(
      'Content-Type',
      stat.metaData?.['content-type'] || 'application/octet-stream',
    );
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName.replace(/["\\]/g, '_')}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    let completed = false;
    res.on('finish', () => {
      if (!completed && res.statusCode === 200) {
        completed = true;
        void prisma.video
          .update({
            where: { id: videoId },
            data: { downloadCount: { increment: 1 } },
          })
          .catch((error) =>
            logger.warn({ error, videoId }, 'Unable to update download count'),
          );
      }
    });
    req.on('aborted', () => stream.destroy());
    stream.on('error', (error) => {
      logger.warn({ error, videoId }, 'Download interrupted');
      res.destroy(error);
    });
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}
