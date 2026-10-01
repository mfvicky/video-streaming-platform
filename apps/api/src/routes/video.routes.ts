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

// Protect endpoints using authenticateJWT
router.post('/upload', authenticateJWT, uploadVideoMiddleware.single('video'), uploadVideoController);
router.get('/stream/:videoId', authenticateJWT, getStreamUrlController);

router.get('/thumbnail/:videoId', authenticateJWT, getThumbnailUrlController);
router.get('/creator', authenticateJWT, getCreatorVideosController);

// Retry / Restart HLS Processing endpoint
router.post('/retry/:videoId', authenticateJWT, retryVideoProcessingController);

// Delete Video endpoint
router.delete('/:videoId', authenticateJWT, deleteVideoController);

// Public Feed Route
router.get('/feed', getVideoFeed);



export default router;