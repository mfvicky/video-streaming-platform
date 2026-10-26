import type { Request, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * HLS manifests and segments are requested frequently when the user seeks.
 * Keep these in a separate, more generous IP bucket without weakening the
 * rate limit on authentication or other API endpoints.
 *
 * This matches Express's full request path because the limiter is attached
 * globally in app.ts, before the /api/v1/video router is mounted.
 */
export function isPublicMediaRequest(
  req: Pick<Request, 'method' | 'path'>,
): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  return (
    /^\/api\/v1\/video\/hls\/[^/]+\/.+$/.test(req.path) ||
    /^\/api\/v1\/video\/image\/[^/]+\/?$/.test(req.path)
  );
}

// Ordinary API operations (feed, upload, retry, account actions, etc.).
const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});

// Media has its own counter, so seeking doesn't exhaust the API quota.
// In production also use caching/CDN edge limits for streamed media.
const mediaRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.max(3000, env.RATE_LIMIT_MAX_REQUESTS * 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many media requests from this IP, please try again later.',
  },
});

// Multipart uploads are bounded and authenticated. A 2GiB file needs ~256
// chunk requests; do not let these exhaust the ordinary browsing quota.
const uploadPartRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many upload chunks, try later.' },
});

// Keep the existing name used in app.ts; no other application file is needed.
export const globalRateLimiter: RequestHandler = (req, res, next) => {
  if (
    req.method === 'PUT' &&
    /^\/api\/v1\/video\/upload-sessions\/[^/]+\/parts\/\d+$/.test(req.path)
  ) {
    return uploadPartRateLimiter(req, res, next);
  }
  if (isPublicMediaRequest(req)) {
    return mediaRateLimiter(req, res, next);
  }
  return apiRateLimiter(req, res, next);
};

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 10, // tighter rate limit for login and registration
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or registration attempts, please try again later.',
  },
});

// Session renewal is not a password guess; keep its separate quota.
export const refreshRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many session requests, try again later.',
  },
});
