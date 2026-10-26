import app from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma, checkDatabaseConnection } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { connectRabbitMQ, closeRabbitMQ } from './lib/rabbitmq.js';
import { initBuckets } from './lib/storage.js';
import { purgeExpiredMultipartSessions } from './services/multipart-upload.service.js';

async function connectRabbitMQWithRetry(
  maxAttempts = 12,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await connectRabbitMQ();
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        1000 * 2 ** (attempt - 1),
        10000,
      );

      logger.warn(
        { attempt, maxAttempts, error },
        'RabbitMQ unavailable, retrying connection',
      );

      await new Promise<void>((resolve) =>
        setTimeout(resolve, delay),
      );
    }
  }
}



async function bootstrap() {
  try {
    // 1. MUST AWAIT Database Ping first
    await checkDatabaseConnection();

    // 2. Connect RabbitMQ
    await connectRabbitMQWithRetry();

    // 3. Initialize MinIO Buckets (Ensures 'videos' & 'thumbnails' exist)
    await initBuckets();
    logger.info('MinIO buckets initialized successfully.');

    // Reclaim orphaned S3 multipart parts (24h retention). Repeats hourly.
    await purgeExpiredMultipartSessions().catch((error) =>
      logger.warn({ error }, 'Upload cleanup unavailable'),
    );
    const uploadCleanup = setInterval(
      () => {
        purgeExpiredMultipartSessions().catch((error) =>
          logger.warn({ error }, 'Upload cleanup failed'),
        );
      },
      60 * 60 * 1000,
    );
    uploadCleanup.unref();

    // 4. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      logger.info(
        `Server running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`,
      );
    });

    // 5. Graceful Shutdown Function
    let isShuttingDown = false;

    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Close HTTP server to stop accepting new requests
      server.close(async () => {
        logger.info('HTTP server closed.');

        try {
          // Disconnect database & infrastructure clients
          await prisma.$disconnect();
          logger.info('Prisma disconnected.');

          await redis.quit();
          logger.info('Redis disconnected.');

          await closeRabbitMQ();
          logger.info('RabbitMQ connection closed.');

          logger.info('Graceful shutdown completed. Exiting.');

          // Give Pino stream time to flush before exiting
          setTimeout(() => process.exit(0), 100);
        } catch (err) {
          logger.error({ err }, 'Error during graceful shutdown');
          process.exit(1);
        }
      });
    };

    // Register Process Listeners for Windows & Unix
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle standard Windows exit event
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        gracefulShutdown('SIGTERM');
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start application server');
    process.exit(1);
  }
}

bootstrap();
