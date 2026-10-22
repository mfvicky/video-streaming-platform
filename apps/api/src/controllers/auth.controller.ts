import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { env } from '../config/env.js';

const COOKIE_PATH = '/api/v1/auth';
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: COOKIE_PATH,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(
        req.body,
      );
      // Remove a legacy root-path cookie left by older app versions.
      res.clearCookie('refreshToken', { path: '/' });
      res.cookie('refreshToken', refreshToken, refreshCookieOptions);
      res.status(200).json({ success: true, data: { user, accessToken } });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.refresh(
        req.cookies?.refreshToken,
      );
      // Remove a legacy root-path cookie left by older app versions.
      res.clearCookie('refreshToken', { path: '/' });
      res.cookie('refreshToken', refreshToken, refreshCookieOptions);
      res.status(200).json({ success: true, data: { user, accessToken } });
    } catch (error) {
      res.clearCookie('refreshToken', {
        path: COOKIE_PATH,
        sameSite: 'strict',
        secure: refreshCookieOptions.secure,
      });
      res.clearCookie('refreshToken', { path: '/' });
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.logout(req.cookies?.refreshToken);
      res.clearCookie('refreshToken', {
        path: COOKIE_PATH,
        sameSite: 'strict',
        secure: refreshCookieOptions.secure,
      });
      res.clearCookie('refreshToken', { path: '/' });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}
