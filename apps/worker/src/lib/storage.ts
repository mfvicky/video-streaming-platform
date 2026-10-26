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

export async function ensureBucketExists(bucketName: string): Promise<void> {
  if (!(await storageClient.bucketExists(bucketName))) {
    await storageClient.makeBucket(bucketName, 'us-east-1');
  }
  // Do NOT change bucket policy here: the API bootstrap enforces private access.
}

export async function uploadFolderToMinio(
  bucketName: string,
  targetPrefix: string,
  localFolderPath: string,
): Promise<void> {
  await ensureBucketExists(bucketName);
  for (const file of await fs.readdir(localFolderPath)) {
    const fullPath = path.join(localFolderPath, file);
    if ((await fs.stat(fullPath)).isDirectory()) {
      await uploadFolderToMinio(
        bucketName,
        `${targetPrefix}/${file}`,
        fullPath,
      );
    } else {
      const destinationKey = `${targetPrefix}/${file}`;
      const contentType = file.endsWith('.m3u8')
        ? 'application/vnd.apple.mpegurl'
        : file.endsWith('.ts')
          ? 'video/mp2t'
          : file.endsWith('.jpg')
            ? 'image/jpeg'
            : 'application/octet-stream';
      await storageClient.fPutObject(bucketName, destinationKey, fullPath, {
        'Content-Type': contentType,
      });
    }
  }
}
