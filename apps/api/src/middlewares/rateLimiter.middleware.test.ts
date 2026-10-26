import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/env.js', () => ({
  env: { RATE_LIMIT_WINDOW_MS: 900000, RATE_LIMIT_MAX_REQUESTS: 300 },
}));

import {
  globalRateLimiter,
  isPublicMediaRequest,
} from './rateLimiter.middleware.js';

const app = express();
app.use(globalRateLimiter);
app.get('/api/v1/video/hls/:videoId/*asset', (_req, res) =>
  res.status(200).send('#EXTM3U'),
);
app.get('/api/v1/video/image/:videoId', (_req, res) =>
  res.status(200).send('image'),
);
app.get('/api/v1/video/feed', (_req, res) => res.status(200).json([]));
app.post('/api/v1/video/retry/:videoId', (_req, res) =>
  res.status(200).json({ ok: true }),
);

describe('media requests have a separate limiter', () => {
  it('matches only GET/HEAD HLS assets and image requests', () => {
    expect(
      isPublicMediaRequest({
        method: 'GET',
        path: '/api/v1/video/hls/vid_1/master.m3u8',
      }),
    ).toBe(true);
    expect(
      isPublicMediaRequest({
        method: 'GET',
        path: '/api/v1/video/hls/vid_1/0/segment_001.ts',
      }),
    ).toBe(true);
    expect(
      isPublicMediaRequest({
        method: 'HEAD',
        path: '/api/v1/video/image/vid_1',
      }),
    ).toBe(true);
    expect(
      isPublicMediaRequest({ method: 'GET', path: '/api/v1/video/feed' }),
    ).toBe(false);
    expect(
      isPublicMediaRequest({
        method: 'POST',
        path: '/api/v1/video/hls/vid_1/master.m3u8',
      }),
    ).toBe(false);
    expect(
      isPublicMediaRequest({
        method: 'POST',
        path: '/api/v1/video/retry/vid_1',
      }),
    ).toBe(false);
    expect(
      isPublicMediaRequest({ method: 'POST', path: '/api/v1/auth/login' }),
    ).toBe(false);
  });

  it('sends HLS GET requests to the larger rate-limit bucket', async () => {
    const res = await request(app).get('/api/v1/video/hls/vid_1/master.m3u8');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBe('3000');
  });

  it('keeps ordinary API and write requests at the general rate limit', async () => {
    const feed = await request(app).get('/api/v1/video/feed');
    const retry = await request(app).post('/api/v1/video/retry/vid_1');
    expect(feed.headers['ratelimit-limit']).toBe('300');
    expect(retry.headers['ratelimit-limit']).toBe('300');
  });
});
