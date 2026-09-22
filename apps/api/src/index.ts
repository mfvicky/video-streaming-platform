// import app from './app';
// import { env } from './config/env';
// import { logger } from './lib/logger';
// import { prisma } from './lib/prisma';
// import { redis } from './lib/redis';
// import { connectRabbitMQ } from './lib/rabbitmq';

// async function bootstrap() {
//   // Connect background services
//    connectRabbitMQ();

//   const server = app.listen(env.PORT, () => {
//     logger.info(`Server running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
//   });

//   const gracefulShutdown = async (signal: string) => {
//     logger.info(`Received ${signal}. Starting graceful shutdown...`);

//     server.close(async () => {
//       logger.info('HTTP server closed.');

//       try {
//         await prisma.$disconnect();
//         logger.info('Prisma disconnected.');

//         await redis.quit();
//         logger.info('Redis disconnected.');

//         // await closeRabbitMQ();

//         process.exit(0);
//       } catch (err) {
//         logger.error({ err }, 'Error during graceful shutdown');
//         process.exit(1);
//       }
//     });
//   };

//   process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
//   process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// }

// bootstrap();

import app from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma, checkDatabaseConnection } from './lib/prisma';
import { redis } from './lib/redis';
import { connectRabbitMQ, closeRabbitMQ } from './lib/rabbitmq';

async function bootstrap() {
  try {
    // 1. MUST AWAIT Database Ping first
    await checkDatabaseConnection();

    // 2. Connect RabbitMQ
    await connectRabbitMQ();

    // 3. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // 4. Graceful Shutdown Function
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