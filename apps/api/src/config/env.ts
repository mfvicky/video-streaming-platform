import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Auth
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  REFRESH_SECRET: z.string().min(8, 'REFRESH_SECRET must be at least 8 characters'),

  // Database & Cache
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),

  // Message Queue
  RABBITMQ_URL: z.string().url(),
  QUEUE_NAME: z.string().default('video_processing_queue'),

  // Object Storage
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.string().default('9000').transform(Number),
  MINIO_USE_SSL: z.string().transform((val) => val === 'true'),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET_NAME: z.string().default('video-uploads'),

  // Logging & Security
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('5').transform(Number),
});

export const env = envSchema.parse(process.env);