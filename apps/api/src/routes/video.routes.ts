import { Router } from 'express';
import { uploadVideoMiddleware } from '../middlewares/upload.middleware';
import { uploadVideoController, getStreamUrlController, getThumbnailUrlController } from '../controllers/video.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Protect endpoints using authenticateJWT
router.post('/upload', authenticateJWT, uploadVideoMiddleware.single('video'), uploadVideoController);
router.get('/stream/:videoId', authenticateJWT, getStreamUrlController);

router.get('/thumbnail/:videoId', authenticateJWT, getThumbnailUrlController);

export default router;