import Redis from 'ioredis';
import { env } from '../config/env.config';
import { logger } from './logger';

const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => logger.warn({ err }, 'Worker Redis error'));

export interface Progress {
  videoId: string;
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  percent: number;
  stage: string;
  attempt: number;
  error?: string;
  updatedAt: string;
}

export async function updateProgress(
  videoId: string,
  jobId: string,
  status: Progress['status'],
  percent: number,
  stage: string,
  attempt: number,
  error?: string,
): Promise<void> {
  const data: Progress = {
    videoId,
    jobId,
    status,
    percent,
    stage,
    attempt,
    updatedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  };
  try {
    // JobId is checked in SQL; this key is only an ephemeral presentation cache.
    await redis.set(
      `video:progress:${videoId}`,
      JSON.stringify(data),
      'EX',
      7 * 24 * 60 * 60,
    );
  } catch (err) {
    logger.warn({ err, videoId }, 'Unable to record Redis progress');
  }
}
