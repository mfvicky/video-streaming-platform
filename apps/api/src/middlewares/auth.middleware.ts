import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Extend Express Request interface to hold user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
    }
  }
}

interface JwtPayload {
  sub?: string;
  id?: string;
  email?: string;
  role?: string;
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access token missing or malformed',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Extract user ID from 'sub' (JWT standard) or fallback to 'id'
    const userId = decoded.sub || decoded.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload: User ID missing',
      });
    }

    req.user = {
      id: userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};