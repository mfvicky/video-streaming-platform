import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env / .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Message Queue
  RABBITMQ_URL: z.string().url('RABBITMQ_URL must be a valid AMQP URL').default('amqp://guest:guest@localhost:5672'),
  QUEUE_NAME: z.string().default('video_processing_queue'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(65535))
    .default('6379'),

  // MinIO Storage
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(65535))
    .default('9000'),
  MINIO_USE_SSL: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  MINIO_ACCESS_KEY: z.string().min(1, 'MINIO_ACCESS_KEY is required'),
  MINIO_SECRET_KEY: z.string().min(1, 'MINIO_SECRET_KEY is required'),
  MINIO_BUCKET_NAME: z.string().default('video-uploads'),

  // FFmpeg & Logging
  FFMPEG_TEMP_DIR: z.string().default('./temp'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables in worker process:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;