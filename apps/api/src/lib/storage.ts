import * as Minio from 'minio';
import { env } from '../config/env';

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

// Auto-initialize required buckets and set public policies
export const initBuckets = async () => {
  // const buckets = ['videos', 'thumbnails'];
  const buckets = ['videos'];

  for (const bucket of buckets) {
    try {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
        console.log(`[MinIO] Bucket "${bucket}" created successfully.`);
      }

      // Configure Public Read (s3:GetObject) policy for HLS streaming & assets
      const publicReadPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };

      await minioClient.setBucketPolicy(bucket, JSON.stringify(publicReadPolicy));
      console.log(`[MinIO] Public read policy set successfully for bucket "${bucket}".`);
    } catch (error) {
      console.error(`[MinIO] Error configuring bucket "${bucket}":`, error);
    }
  }
};