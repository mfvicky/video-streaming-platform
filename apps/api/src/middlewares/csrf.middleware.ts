import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/** SameSite=Strict cookies plus a strict Origin check prevent cookie-based
 * mutations initiated from attacker-controlled origins (including same-site
 * but cross-origin ports). Non-browser clients without Origin can still send
 * Authorization; browser fetch always supplies Origin on cross-origin POSTs.
 */
export function protectCookieMutations(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const fetchSite = req.get('sec-fetch-site');
  const allowed = new Set([env.CORS_ORIGIN, `${req.protocol}://${req.get('host')}`]);
  if ((origin && !allowed.has(origin)) || fetchSite === 'cross-site') {
    return res.status(403).json({ success: false, message: 'Untrusted request origin' });
  }
  return next();
}
