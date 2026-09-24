import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app';

describe('Express Application Middlewares', () => {
  it('should accept JSON payloads under 100kb', async () => {
    const smallPayload = { name: 'A'.repeat(1000) }; // ~1KB

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(smallPayload);

    // Expect auth logic error (e.g., 400/401/500), NOT payload too large (413)
    expect(response.status).not.toBe(413);
  });

  it('should reject JSON payloads exceeding 100kb with HTTP 413', async () => {
    const largePayload = { data: 'A'.repeat(105 * 1024) }; // ~105KB

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(largePayload);

    expect(response.status).toBe(413);
  });
});