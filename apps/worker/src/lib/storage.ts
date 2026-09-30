import * as Minio from 'minio';
import path from 'path';
import fs from 'fs-extra';
import { env } from '../config/env.config';

export const storageClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

/**
 * Ensures the target bucket exists in MinIO and applies a public read policy for video streaming
 */
export async function ensureBucketExists(bucketName: string): Promise<void> {
  try {
    const exists = await storageClient.bucketExists(bucketName);
    if (!exists) {
      await storageClient.makeBucket(bucketName, 'us-east-1');
      console.log(`[Worker MinIO] Created missing bucket: ${bucketName}`);
    }

    // Set public read policy for HLS manifests, segments, and thumbnails
    const publicReadPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };

    await storageClient.setBucketPolicy(bucketName, JSON.stringify(publicReadPolicy));
    console.log(`[Worker MinIO] Public read policy set for bucket: ${bucketName}`);
  } catch (error) {
    console.error(`[Worker MinIO] Failed to verify/configure bucket ${bucketName}:`, error);
    throw error;
  }
}

/**
 * Recursively uploads all files (playlists, segments, and images) in a folder to MinIO
 */
export async function uploadFolderToMinio(
  bucketName: string,
  targetPrefix: string,
  localFolderPath: string
): Promise<void> {
  await ensureBucketExists(bucketName);

  const files = await fs.readdir(localFolderPath);

  for (const file of files) {
    const fullPath = path.join(localFolderPath, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      await uploadFolderToMinio(bucketName, `${targetPrefix}/${file}`, fullPath);
    } else {
      const destinationKey = `${targetPrefix}/${file}`;

      let contentType = 'application/octet-stream';
      if (file.endsWith('.m3u8')) {
        contentType = 'application/x-mpegURL';
      } else if (file.endsWith('.ts')) {
        contentType = 'video/MP2T';
      } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      }

      await storageClient.fPutObject(bucketName, destinationKey, fullPath, {
        'Content-Type': contentType,
      });
    }
  }
}