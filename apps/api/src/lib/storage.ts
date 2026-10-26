import * as Minio from 'minio';
import { env } from '../config/env.js';
import { logger } from './logger.js';
export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export const initBuckets = async () => {
  const bucket = env.MINIO_BUCKET_NAME;
  if (!(await minioClient.bucketExists(bucket))) {
    await minioClient.makeBucket(bucket, 'us-east-1');
  }
  // Empty policy performs DELETE (including pre-existing wildcard public grants).
  // Fail startup if privacy cannot be enforced.
  try {
    await minioClient.setBucketPolicy(bucket, '');
  } catch (err: unknown) {
    // A never-public bucket may have no policy to remove (S3 NoSuchBucketPolicy).
    if (
      !err ||
      typeof err !== 'object' ||
      !('code' in err) ||
      err.code !== 'NoSuchBucketPolicy'
    ) {
      throw err;
    }
  }
  logger.info(
    { bucket },
    'Private MinIO bucket initialized; anonymous access disabled',
  );
};
