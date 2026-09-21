import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma Client instances during local hot-reloading
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = db;
}

// Re-export generated Prisma types (e.g., User, VideoJob, JobStatus)
export * from '@prisma/client';