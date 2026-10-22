import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@app/db';
import {
  RegisterInput,
  LoginInput,
  UserRole,
  registerSchema,
} from '@app/shared';
import { env } from '../config/env.js';
import { decryptPassword } from '../utils/crypto.js';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_SECONDS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
const tokenDigest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export class AuthService {
  static async register(input: RegisterInput) {
    if (input.role === 'ADMIN')
      throw new AppError(403, 'Admin registration is not permitted');
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingUser)
      throw new AppError(409, 'User already exists with this email');

    let plainTextPassword: string;
    try {
      plainTextPassword = decryptPassword(input.password);
    } catch {
      throw new AppError(400, 'Invalid encrypted password');
    }
    registerSchema.shape.password.parse(plainTextPassword);
    const hashedPassword = await bcrypt.hash(plainTextPassword, 12);
    return prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: (input.role as UserRole) || 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    // Use a single generic message for nonexistent accounts and wrong passwords.
    if (!user) throw new AppError(401, 'Invalid email or password');
    let plainTextPassword: string;
    try {
      plainTextPassword = decryptPassword(input.password);
    } catch {
      throw new AppError(401, 'Invalid email or password');
    }
    if (!(await bcrypt.compare(plainTextPassword, user.password))) {
      throw new AppError(401, 'Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = await this.generateRefreshToken(user.id);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(rawToken: string | undefined) {
    if (!rawToken) throw new AppError(401, 'Refresh token missing');
    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(rawToken, env.REFRESH_SECRET, {
        algorithms: ['HS256'],
      });
      if (typeof decoded === 'string' || !decoded.sub || !decoded.jti)
        throw new Error('Invalid refresh payload');
      payload = decoded;
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
    const hash = tokenDigest(rawToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
    });
    if (
      !stored ||
      stored.userId !== payload.sub ||
      stored.expiresAt <= new Date()
    ) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new AppError(401, 'Invalid refresh token owner');
    // Atomic consume: concurrent refresh calls must not both reuse the same token.
    const consumed = await prisma.refreshToken.deleteMany({
      where: { id: stored.id, tokenHash: hash },
    });
    if (consumed.count !== 1)
      throw new AppError(401, 'Refresh token already used');
    const refreshToken = await this.generateRefreshToken(user.id);
    return {
      accessToken: this.generateAccessToken(user.id, user.role),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  static async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) {
      await prisma.refreshToken.deleteMany({
        where: { tokenHash: tokenDigest(rawToken) },
      });
    }
  }

  private static generateAccessToken(userId: string, role: string): string {
    return jwt.sign({ sub: userId, role }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  private static async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = jwt.sign(
      { sub: userId, jti: randomUUID() },
      env.REFRESH_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: REFRESH_TOKEN_SECONDS,
      },
    );
    await prisma.refreshToken.create({
      data: {
        tokenHash: tokenDigest(refreshToken),
        userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_SECONDS * 1000),
      },
    });
    return refreshToken;
  }
}
