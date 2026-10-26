import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  database: vi.fn(),
  cache: vi.fn(),
  storage: vi.fn(),
  queueConnected: vi.fn(),
}));
vi.mock('../lib/prisma.js', () => ({ prisma: { $queryRaw: mocks.database } }));
vi.mock('../lib/redis.js', () => ({ redis: { ping: mocks.cache } }));
vi.mock('../lib/storage.js', () => ({
  minioClient: { bucketExists: mocks.storage },
}));
vi.mock('../lib/rabbitmq.js', () => ({
  isRabbitMQConnected: mocks.queueConnected,
}));
vi.mock('../config/env.js', () => ({ env: { MINIO_BUCKET_NAME: 'videos' } }));

import healthRoutes from './health.routes.js';

const app = express();
app.use('/health', healthRoutes);

describe('release readiness endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.database.mockResolvedValue([{ result: 1 }]);
    mocks.cache.mockResolvedValue('PONG');
    mocks.storage.mockResolvedValue(true);
    mocks.queueConnected.mockReturnValue(true);
  });
  it('returns 200 without leaking infrastructure details when ready', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('returns 503 when a dependency is unavailable', async () => {
    mocks.cache.mockRejectedValue(new Error('connection down'));
    const response = await request(app).get('/health');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable' });
  });
  it('returns 503 when the broker is disconnected', async () => {
    mocks.queueConnected.mockReturnValue(false);
    const response = await request(app).get('/health');
    expect(response.status).toBe(503);
  });
});
