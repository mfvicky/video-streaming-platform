import { vi } from 'vitest';

// 1. Prisma Mock
export const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};

// 2. Redis Mock
export const redisMock = {
  setex: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
};

// 3. RabbitMQ Mock
export const rabbitMQMock = {
  connect: vi.fn().mockResolvedValue({
    createChannel: vi.fn().mockResolvedValue({
      assertQueue: vi.fn().mockResolvedValue({}),
      sendToQueue: vi.fn().mockReturnValue(true),
      consume: vi.fn(),
      close: vi.fn().mockResolvedValue({}),
    }),
    close: vi.fn().mockResolvedValue({}),
  }),
};

// 4. MinIO / Storage Mock
export const minioMock = {
  listBuckets: vi.fn().mockResolvedValue([]),
  bucketExists: vi.fn().mockResolvedValue(true),
  makeBucket: vi.fn().mockResolvedValue({}),
  presignedPutObject: vi.fn().mockResolvedValue('https://mock-s3-upload-url.com'),
  presignedGetObject: vi.fn().mockResolvedValue('https://mock-s3-download-url.com'),
};

// --- Module Registrations ---

vi.mock('@app/db', () => ({
  PrismaClient: vi.fn(function () {
    return prismaMock;
  }),
  prisma: prismaMock,
}));

vi.mock('../lib/redis', () => ({
  redis: redisMock,
}));

vi.mock('amqplib', () => ({
  default: rabbitMQMock,
}));

vi.mock('minio', () => ({
  Client: vi.fn(function () {
    return minioMock;
  }),
}));