import { Router } from 'express';
import { uploadVideoMiddleware } from '../middlewares/upload.middleware';
import { 
  uploadVideoController, 
  getStreamUrlController, 
  getThumbnailUrlController, 
  getVideoFeed, 
  getCreatorVideosController,
  retryVideoProcessingController,
  deleteVideoController
} from '../controllers/video.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Video:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "vid_1711880000000_a1b2c"
 *         title:
 *           type: string
 *           example: "My First Streaming Video"
 *         creatorId:
 *           type: string
 *           format: uuid
 *           example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
 *         status:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *           example: "PENDING"
 *         rawPath:
 *           type: string
 *           example: "raw/9b1deb4d/vid_1711880000000_a1b2c_sample.mp4"
 *         thumbnailPath:
 *           type: string
 *           nullable: true
 *           example: "thumbnails/vid_1711880000000_a1b2c.jpg"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-10-05T12:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-10-05T12:00:00.000Z"
 * 
 *     StreamUrlResponse:
 *       type: object
 *       properties:
 *         streamUrl:
 *           type: string
 *           format: uri
 *           example: "http://localhost:9000/videos/hls/vid_123/master.m3u8?X-Amz-Algorithm=..."
 * 
 *     ThumbnailUrlResponse:
 *       type: object
 *       properties:
 *         thumbnailUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "http://localhost:9000/videos/thumbnails/vid_123.jpg?X-Amz-Algorithm=..."
 * 
 * tags:
 *   - name: Video Management
 *     description: Video uploading, streaming, feed retrieval, and processing lifecycle operations
 */

/**
 * @openapi
 * /api/v1/video/upload:
 *   post:
 *     summary: Upload a new video and initiate transcoding
 *     tags: [Video Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "My First Streaming Video"
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video media file to upload
 *     responses:
 *       201:
 *         description: Video uploaded and queued for processing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Video'
 *       400:
 *         description: Missing title or video file
 *       401:
 *         description: Unauthorized - Invalid or missing JWT
 */
router.post('/upload', authenticateJWT, uploadVideoMiddleware.single('video'), uploadVideoController);

/**
 * @openapi
 * /api/v1/video/stream/{videoId}:
 *   get:
 *     summary: Get a pre-signed URL for the master HLS playlist
 *     tags: [Video Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         example: "vid_1711880000000_a1b2c"
 *     responses:
 *       200:
 *         description: Returns temporary presigned HLS playlist URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StreamUrlResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Video not found or HLS stream unavailable
 */
router.get('/stream/:videoId', authenticateJWT, getStreamUrlController);

/**
 * @openapi
 * /api/v1/video/thumbnail/{videoId}:
 *   get:
 *     summary: Get a pre-signed URL for the video's thumbnail
 *     tags: [Video Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         example: "vid_1711880000000_a1b2c"
 *     responses:
 *       200:
 *         description: Returns temporary presigned thumbnail URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ThumbnailUrlResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Thumbnail not found
 */
router.get('/thumbnail/:videoId', authenticateJWT, getThumbnailUrlController);

/**
 * @openapi
 * /api/v1/video/creator:
 *   get:
 *     summary: Retrieve all videos uploaded by the authenticated creator
 *     tags: [Video Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of videos for current creator
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Video'
 *       401:
 *         description: Unauthorized
 */
router.get('/creator', authenticateJWT, getCreatorVideosController);

/**
 * @openapi
 * /api/v1/video/retry/{videoId}:
 *   post:
 *     summary: Retry/restart background HLS transcoding job for a video
 *     tags: [Video Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         example: "vid_1711880000000_a1b2c"
 *     responses:
 *       200:
 *         description: Processing job re-queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Video'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Video does not belong to requesting creator
 *       404:
 *         description: Video not found
 */
router.post('/retry/:videoId', authenticateJWT, retryVideoProcessingController);

/**
 * @openapi
 * /api/v1/video/{videoId}:
 *   delete:
 *     summary: Delete a video and purge all associated files from storage
 *     tags: [Video Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         example: "vid_1711880000000_a1b2c"
 *     responses:
 *       200:
 *         description: Video deleted from database and storage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Video does not belong to requesting creator
 *       404:
 *         description: Video not found
 */
router.delete('/:videoId', authenticateJWT, deleteVideoController);

/**
 * @openapi
 * /api/v1/video/feed:
 *   get:
 *     summary: Get public video feed
 *     tags: [Video Management]
 *     responses:
 *       200:
 *         description: Public list of videos available for playback
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Video'
 */
router.get('/feed', getVideoFeed);

export default router;