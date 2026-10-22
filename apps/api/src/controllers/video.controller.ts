import { unlink } from 'node:fs/promises';
import { env } from '../config/env.js';
import { minioClient } from '../lib/storage.js';
import { Request, Response, NextFunction } from 'express';
import { videoService } from '../services/video.service.js';
import { prisma } from '../lib/prisma.js';

export const uploadVideoController = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { title } = req.body;
    if (typeof title !== 'string' || !title.trim())
      return res
        .status(400)
        .json({ success: false, message: 'Title is required' });

    // Extract creator ID from verified JWT token
    const creatorId = req.user?.id;
    if (!creatorId) {
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized: Creator ID missing' });
    }

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: 'No video file uploaded' });
    }

    const video = await videoService.uploadAndEnqueueVideo(
      creatorId,
      title,
      file,
    );
    return res.status(201).json({ success: true, data: video });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: 'Video upload failed' });
  } finally {
    if (req.file?.path) await unlink(req.file.path).catch(() => {});
  }
};

const mediaBase = (req: Request): string =>
  `${req.protocol}://${req.get('host')}/api/v1/video`;

// Videos in READY status are public feed videos. Source/original objects are never exposed.
export const getStreamUrlController = async (req: Request, res: Response) => {
  const videoId = String(req.params.videoId || '');
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { status: true },
  });
  if (!video || video.status !== 'READY')
    return res
      .status(404)
      .json({ success: false, message: 'Video is not ready' });
  return res.json({
    success: true,
    streamUrl: `${mediaBase(req)}/hls/${encodeURIComponent(videoId)}/master.m3u8`,
  });
};

export const getThumbnailUrlController = async (
  req: Request,
  res: Response,
) => {
  const videoId = String(req.params.videoId || '');
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { status: true, thumbnailPath: true },
  });
  if (!video || video.status !== 'READY' || !video.thumbnailPath)
    return res.status(404).json({ message: 'Thumbnail not ready' });
  return res.json({
    thumbnailUrl: `${mediaBase(req)}/image/${encodeURIComponent(videoId)}`,
  });
};

// All manifest/segment paths are constrained to generated HLS assets, never raw objects.
export const getHlsAssetController = async (req: Request, res: Response) => {
  const videoId = String(req.params.videoId || '');
  const filePath = Array.isArray(req.params.asset)
    ? req.params.asset.join('/')
    : String(req.params.asset || '');
  if (
    !/^vid_[a-z0-9_]+$/i.test(videoId) ||
    !/^(?:master\.m3u8|[01]\/(?:manifest\.m3u8|segment_\d+\.ts))$/.test(
      filePath,
    )
  ) {
    return res.status(400).end();
  }
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { status: true },
  });
  if (!video || video.status !== 'READY') return res.status(404).end();
  const isPlaylist = filePath.endsWith('.m3u8');
  res.type(isPlaylist ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
  res.setHeader('Cache-Control', 'public, max-age=60');
  try {
    const stream = await minioClient.getObject(
      env.MINIO_BUCKET_NAME,
      `hls/${videoId}/${filePath}`,
    );
    stream.on('error', () => {
      if (!res.headersSent) res.status(404);
      res.end();
    });
    stream.pipe(res);
  } catch {
    return res.status(404).end();
  }
};

export const getThumbnailAssetController = async (
  req: Request,
  res: Response,
) => {
  const videoId = String(req.params.videoId || '');
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { status: true, thumbnailPath: true },
  });
  if (!video || video.status !== 'READY' || !video.thumbnailPath)
    return res.status(404).end();
  try {
    const stream = await minioClient.getObject(
      env.MINIO_BUCKET_NAME,
      video.thumbnailPath,
    );
    res.type('image/jpeg');
    stream.on('error', () => {
      if (!res.headersSent) res.status(404);
      res.end();
    });
    stream.pipe(res);
  } catch {
    return res.status(404).end();
  }
};

export const getVideoFeed = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 10),
    );
    const skip = (page - 1) * limit;

    // Fetch videos matching Prisma schema (status = READY)
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { status: 'READY' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          thumbnailPath: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.video.count({ where: { status: 'READY' } }),
    ]);

    // Format response and derive thumbnail URLs
    const formattedVideos = await Promise.all(
      videos.map(async (video) => {
        let thumbnailUrl: string | null = null;
        try {
          thumbnailUrl = video.thumbnailPath
            ? `${mediaBase(req)}/image/${encodeURIComponent(video.id)}`
            : null;
        } catch {
          thumbnailUrl = null;
        }

        return {
          id: video.id,
          title: video.title,
          createdAt: video.createdAt,
          thumbnailUrl,
          user: video.creator,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: formattedVideos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCreatorVideosController = async (
  req: Request,
  res: Response,
) => {
  try {
    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID parameter is required',
      });
    }

    const videos = await videoService.getVideosByCreatorId(creatorId);

    return res.status(200).json({
      success: true,
      videos,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const retryVideoProcessingController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { videoId } = req.params;
    const creatorId = req.user?.id;

    const targetVideoId = Array.isArray(videoId) ? videoId[0] : videoId;

    if (!targetVideoId) {
      return res
        .status(400)
        .json({ success: false, message: 'Video ID parameter is required' });
    }

    if (!creatorId) {
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized: Creator ID missing' });
    }

    const video = await videoService.retryVideoProcessing(
      targetVideoId,
      creatorId,
    );

    return res.status(200).json({
      success: true,
      message: 'HLS transcoding job successfully re-queued',
      data: video,
    });
  } catch (error: any) {
    return res
      .status(
        /Unauthorized/.test(error.message)
          ? 403
          : /not found/.test(error.message)
            ? 404
            : 500,
      )
      .json({ success: false, message: error.message });
  }
};

export const deleteVideoController = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const creatorId = req.user?.id;

    const targetVideoId = Array.isArray(videoId) ? videoId[0] : videoId;

    if (!targetVideoId) {
      return res
        .status(400)
        .json({ success: false, message: 'Video ID parameter is required' });
    }

    if (!creatorId) {
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized: Creator ID missing' });
    }

    await videoService.deleteVideo(targetVideoId, creatorId);

    return res.status(200).json({
      success: true,
      message: 'Video and associated storage assets deleted successfully',
    });
  } catch (error: any) {
    return res
      .status(
        /Unauthorized/.test(error.message)
          ? 403
          : /not found/.test(error.message)
            ? 404
            : 500,
      )
      .json({ success: false, message: error.message });
  }
};
