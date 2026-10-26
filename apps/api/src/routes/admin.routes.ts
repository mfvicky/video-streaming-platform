import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import {
  requireAdmin,
  getAdminMetrics,
  getAdminVideos,
  adminRetryVideo,
} from '../controllers/admin.controller.js';
const router = Router();
router.use(authenticateJWT, requireAdmin);
router.get('/metrics', getAdminMetrics);
router.get('/videos', getAdminVideos);
router.post('/videos/:videoId/retry', adminRetryVideo);
export default router;
