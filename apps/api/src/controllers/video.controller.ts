import { Request, Response } from 'express';
import { videoService } from '../services/video.service';

export const uploadVideoController = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { title } = req.body;

    // Extract creator ID from verified JWT token
    const creatorId = (req as any).user?.id || req.body.creatorId;
    console.log(creatorId,"creatorId")
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