import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Successfully connected to Redis');
});