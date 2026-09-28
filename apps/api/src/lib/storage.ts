import * as Minio from 'minio';
import { env } from '../config/env';

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

// Auto-initialize required buckets
export const initBuckets = async () => {
  const buckets = ['videos', 'thumbnails'];

  for (const bucket of buckets) {
    try {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
        console.log(`[MinIO] Bucket "${bucket}" created successfully.`);
      }
    } catch (error) {
      console.error(`[MinIO] Error checking/creating bucket "${bucket}":`, error);
    }
  }
};