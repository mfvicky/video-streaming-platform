import { PrismaClient } from '@app/db';
import { logger } from './logger';

export const prisma = new PrismaClient();

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Successfully connected to PostgreSQL');
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to connect to PostgreSQL');
    return false;
  }
}