import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { env } from '../config/env.js';

const REFRESH_PATH = '/api/v1/auth';
const ACCESS_PATH = '/api/v1';
const common = { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict' as const };
const refreshOptions = { ...common, path: REFRESH_PATH, maxAge: 7 * 24 * 60 * 60 * 1000 };
const accessOptions = { ...common, path: ACCESS_PATH, maxAge: 15 * 60 * 1000 };

function setSessionCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('accessToken', accessToken, accessOptions);
  res.cookie('refreshToken', refreshToken, refreshOptions);
}
function clearSessionCookies(res: Response): void {
  res.clearCookie('accessToken', { ...common, path: ACCESS_PATH });
  res.clearCookie('refreshToken', { ...common, path: REFRESH_PATH });
  res.clearCookie('refreshToken', { path: '/' }); // Legacy cookie cleanup.
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) { next(error); }
  }
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);
      res.clearCookie('refreshToken', { path: '/' });
      setSessionCookies(res, accessToken, refreshToken);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ success: true, data: { user } });
    } catch (error) { next(error); }
  }
  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.refresh(req.cookies?.refreshToken);
      res.clearCookie('refreshToken', { path: '/' });
      setSessionCookies(res, accessToken, refreshToken);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ success: true, data: { user } });
    } catch (error) {
      clearSessionCookies(res);
      next(error);
    }
  }
  static async session(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.session(req.user!.id);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ success: true, data: { user } });
    } catch (error) { next(error); }
  }
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.logout(req.cookies?.refreshToken);
      clearSessionCookies(res);
      res.setHeader('Cache-Control', 'no-store');
      res.status(204).end();
    } catch (error) { next(error); }
  }
}
