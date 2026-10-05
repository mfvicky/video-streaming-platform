import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@app/db';
import { RegisterInput, LoginInput, UserRole } from '@app/shared';
import { redis } from '../lib/redis';
import { env } from '../config/env';
import { decryptPassword } from '../utils/crypto';

const prisma = new PrismaClient();

const JWT_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.REFRESH_SECRET;

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AuthService {
  static async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Decrypt the RSA-encrypted password from frontend payload
    const plainTextPassword = decryptPassword(input.password);
    const hashedPassword = await bcrypt.hash(plainTextPassword, 12);

    const user = await prisma.user.create({
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

    return user;
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Decrypt the RSA-encrypted password from frontend payload
    const plainTextPassword = decryptPassword(input.password);
    const isPasswordValid = await bcrypt.compare(plainTextPassword, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
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

  private static generateAccessToken(userId: string, role: string): string {
    return jwt.sign({ sub: userId, role }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  private static async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = jwt.sign({ sub: userId }, REFRESH_SECRET, {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    // Hash refresh token before saving in database
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    // Store in Redis cache for fast lookup & revocation checks
    await redis.setex(`refresh_token:${userId}`, REFRESH_TOKEN_EXPIRY_DAYS * 86400, refreshToken);

    return refreshToken;
  }
}