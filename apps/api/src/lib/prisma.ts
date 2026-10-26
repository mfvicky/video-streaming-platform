import { prisma } from '@app/db';
import { logger } from './logger.js';

export { prisma }; // Reuse package singleton in this API process.

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Successfully connected to PostgreSQL');
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to connect to PostgreSQL');
    throw error;
  }
}
