// import * as Minio from 'minio';
// import path from 'path';
// import fs from 'fs-extra';

// export const storageClient = new Minio.Client({
//   endPoint: process.env.MINIO_ENDPOINT || 'localhost',
//   port: parseInt(process.env.MINIO_PORT || '9000', 10),
//   useSSL: process.env.MINIO_USE_SSL === 'true',
//   accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
//   secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
// });

// /**
//   Recursively uploads all files (playlists & segments) in a folder to MinIO
//  */
// export async function uploadFolderToMinio(
//   bucketName: string,
//   targetPrefix: string,
//   localFolderPath: string
// ): Promise<void> {
//   const files = await fs.readdir(localFolderPath);

//   for (const file of files) {
//     const fullPath = path.join(localFolderPath, file);
//     const stat = await fs.stat(fullPath);

//     if (stat.isDirectory()) {
//       // Recursively upload subdirectories (e.g. variant playlists/segments)
//       await uploadFolderToMinio(bucketName, `${targetPrefix}/${file}`, fullPath);
//     } else {
//       const destinationKey = `${targetPrefix}/${file}`;
      
//       // Determine content-type for HLS files
//       let contentType = 'application/octet-stream';
//       if (file.endsWith('.m3u8')) {
//         contentType = 'application/x-mpegURL';
//       } else if (file.endsWith('.ts')) {
//         contentType = 'video/MP2T';
//       }

//       await storageClient.fPutObject(bucketName, destinationKey, fullPath, {
//         'Content-Type': contentType,
//       });
//     }
//   }
// }
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
 * Ensures the target bucket exists in MinIO before attempting operations
 */
export async function ensureBucketExists(bucketName: string): Promise<void> {
  try {
    const exists = await storageClient.bucketExists(bucketName);
    if (!exists) {
      await storageClient.makeBucket(bucketName, 'us-east-1');
      console.log(`[Worker MinIO] Created missing bucket: ${bucketName}`);
    }
  } catch (error) {
    console.error(`[Worker MinIO] Failed to verify/create bucket ${bucketName}:`, error);
    throw error;
  }
}

/**
 * Recursively uploads all files (playlists & segments) in a folder to MinIO
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
      }

      await storageClient.fPutObject(bucketName, destinationKey, fullPath, {
        'Content-Type': contentType,
      });
    }
  }
}