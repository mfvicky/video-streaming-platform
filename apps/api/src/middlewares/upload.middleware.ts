import multer from 'multer';

// Store chunks in memory before streaming to MinIO
const storage = multer.memoryStorage();

export const uploadVideoMiddleware = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1 GB max limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
        console.log('runn1')
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});