import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app.js';

vi.mock('jsonwebtoken', () => ({ default: { verify: vi.fn() } }));
vi.mock('../middlewares/rateLimiter.middleware.js', () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next();
  return { globalRateLimiter: pass, authRateLimiter: pass, refreshRateLimiter: pass };
});
vi.mock('../lib/redis.js', () => ({ redis: { ping: vi.fn() } }));
vi.mock('../services/auth.service.js', () => ({
  AuthService: {
    session: vi.fn(async (id: string) => ({ id, email: 'user@example.test', name: 'Example', role: 'USER' })),
    login: vi.fn(async () => ({ user: { id: 'usr_1', email: 'user@example.test', role: 'USER' }, accessToken: 'signed-access', refreshToken: 'signed-refresh' })),
  },
}));

describe('HttpOnly cookie authentication and CSRF defenses', () => {
  it('issues HttpOnly cookies without returning JWTs in login JSON', async () => {
    const result = await request(app).post('/api/v1/auth/login')
      .send({ email: 'user@example.test', password: 'encrypted' });
    expect(result.status).toBe(200);
    expect(result.body.data.accessToken).toBeUndefined();
    const rawCookies = result.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    expect(cookies.join(' ')).toContain('HttpOnly');
    expect(cookies.join(' ')).toContain('SameSite=Strict');
    expect(cookies.join(' ')).toContain('accessToken=');
  });
  it('rejects unauthenticated sessions', async () => {
    const result = await request(app).get('/api/v1/auth/session');
    expect(result.status).toBe(401);
  });
  it('uses the access cookie without exposing it to JavaScript', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ sub: 'usr_1', role: 'USER' } as never);
    const result = await request(app)
      .get('/api/v1/auth/session')
      .set('Cookie', 'accessToken=signed-test-cookie');
    expect(result.status).toBe(200);
    expect(result.body.data.user.id).toBe('usr_1');
    expect(result.body.data.accessToken).toBeUndefined();
  });
  it('rejects cross-origin state-changing requests', async () => {
    const result = await request(app).post('/api/v1/auth/logout')
      .set('Origin', 'https://attacker.example');
    expect(result.status).toBe(403);
  });
});
