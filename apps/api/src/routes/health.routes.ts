import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { minioClient } from '../lib/storage.js';
import { env } from '../config/env.js';
import { isRabbitMQConnected } from '../lib/rabbitmq.js';

/** No credentials or internal hostnames are returned to health check callers. */
const router = Router();

router.get('/', async (_req, res) => {
  const [database, cache, storage] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
    minioClient.bucketExists(env.MINIO_BUCKET_NAME),
  ]);
  const ready =
    database.status === 'fulfilled' &&
    cache.status === 'fulfilled' &&
    cache.value === 'PONG' &&
    storage.status === 'fulfilled' &&
    storage.value === true &&
    isRabbitMQConnected();
  res.setHeader('Cache-Control', 'no-store');
  return res
    .status(ready ? 200 : 503)
    .json({ status: ready ? 'ok' : 'unavailable' });
});

export default router;
