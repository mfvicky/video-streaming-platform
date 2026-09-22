import { Request, Response, NextFunction } from 'express';
import { registerSchema as RegisterSchema, loginSchema as LoginSchema } from '@app/shared';
import { AuthService } from '../services/auth.service';

export class AuthController {
    static async register(req: Request, res: Response, next: NextFunction) {
        try {
            const validatedData = RegisterSchema.parse(req.body);
            const user = await AuthService.register(validatedData);

            res.status(201).json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }

    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const validatedData = LoginSchema.parse(req.body);
            const { user, accessToken, refreshToken } = await AuthService.login(validatedData);

            // Attach refresh token inside an HTTP-Only cookie for XSS prevention
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.status(200).json({
                success: true,
                data: {
                    user,
                    accessToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}