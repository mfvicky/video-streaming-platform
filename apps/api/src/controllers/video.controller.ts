import { Request, Response, NextFunction } from 'express';
import { videoService } from '../services/video.service';
import { prisma } from '../lib/prisma';

export const uploadVideoController = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { title } = req.body;

    // Extract creator ID from verified JWT token
    const creatorId = (req as any).user?.id || req.body.creatorId;
    console.log(creatorId, "creatorId");
    if (!creatorId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Creator ID missing' });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    const video = await videoService.uploadAndEnqueueVideo(creatorId, title, file);
    return res.status(201).json({ success: true, data: video });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStreamUrlController = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    // Resolve TypeScript union type string | string[] safely
    const targetVideoId = Array.isArray(videoId) ? videoId[0] : videoId;

    if (!targetVideoId) {
      return res.status(400).json({ success: false, message: 'Video ID parameter is required' });
    }

    const streamUrl = await videoService.getHlsStreamUrl(targetVideoId);
    return res.status(200).json({ success: true, streamUrl });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export async function getThumbnailUrlController(req: Request, res: Response) {
  try {
    const { videoId } = req.params;

    // Resolve TypeScript union type string | string[] safely
    const targetVideoId = Array.isArray(videoId) ? videoId[0] : videoId;

    if (!targetVideoId) {
      return res.status(400).json({ message: 'Video ID parameter is required' });
    }

    const thumbnailUrl = await videoService.getThumbnailUrl(targetVideoId);

    if (!thumbnailUrl) {
      return res.status(404).json({ message: 'Thumbnail not found or processing incomplete' });
    }

    return res.status(200).json({ thumbnailUrl });
  } catch (error) {
    console.error('Error fetching thumbnail URL:', error);
    return res.status(500).json({ message: 'Failed to retrieve thumbnail URL' });
  }
}

export const getVideoFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
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
          rawPath: true,
          thumbnailPath: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
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
          thumbnailUrl = await videoService.getThumbnailUrl(video.id);
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
      })
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

export const getCreatorVideosController = async (req: Request, res: Response) => {
  try {
    const { creatorId: paramCreatorId } = req.params;

    // Resolve TypeScript union type (string | string[]) safely
    const creatorId = Array.isArray(paramCreatorId) 
      ? paramCreatorId[0] 
      : paramCreatorId || req.user?.id;

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

export const retryVideoProcessingController = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const creatorId = (req as any).user?.id || req.body.creatorId;

    const targetVideoId = Array.isArray(videoId) ? videoId[0] : videoId;

    if (!targetVideoId) {
      return res.status(400).json({ success: false, message: 'Video ID parameter is required' });
    }

    if (!creatorId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Creator ID missing' });
    }

    const video = await videoService.retryVideoProcessing(targetVideoId, creatorId);

    return res.status(200).json({
      success: true,
      message: 'HLS transcoding job successfully re-queued',
      data: video,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVideoController = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const creatorId = req.user?.id || req.body?.creatorId;

    const targetVideoId = Array.isArray(videoId) ? videoId[0] : videoId;

    if (!targetVideoId) {
      return res.status(400).json({ success: false, message: 'Video ID parameter is required' });
    }

    if (!creatorId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Creator ID missing' });
    }

    await videoService.deleteVideo(targetVideoId, creatorId);

    return res.status(200).json({
      success: true,
      message: 'Video and associated storage assets deleted successfully',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};