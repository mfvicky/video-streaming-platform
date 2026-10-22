import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 1. Load infrastructure mocks FIRST
import { prismaMock, redisMock } from '../__mocks__/infrastructure';

// 2. Mock external libraries & utilities
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

// Mock decryptPassword to return the raw input string for unit testing
vi.mock('../utils/crypto', () => ({
  decryptPassword: vi.fn((encryptedPassword: string) => encryptedPassword),
}));

// 3. Import service & utility AFTER mocks are registered
import { AuthService } from './auth.service';
import { decryptPassword } from '../utils/crypto';

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerInput = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'USER' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never);
      prismaMock.user.create.mockResolvedValue({
        id: 'usr_123',
        email: registerInput.email,
        name: registerInput.name,
        role: registerInput.role,
        createdAt: new Date(),
      } as never);

      const result = await AuthService.register(registerInput);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerInput.email },
      });
      expect(decryptPassword).toHaveBeenCalledWith(registerInput.password);
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'usr_123');
    });

    it('should throw an error if user already exists', async () => {
      const registerInput = {
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing User',
        role: 'USER' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'usr_existing',
      } as never);

      await expect(AuthService.register(registerInput)).rejects.toThrow(
        'User already exists with this email',
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(decryptPassword).not.toHaveBeenCalled();
    });
  });

  describe('refresh token rotation', () => {
    it('consumes the previous token and issues a new access/refresh pair', async () => {
      const user = {
        id: 'usr_123',
        email: 'test@example.com',
        name: 'User',
        role: 'CREATOR',
      };
      vi.mocked(jwt.verify).mockReturnValue({
        sub: user.id,
        jti: 'nonce',
      } as never);
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'old-token-id',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60000),
      } as never);
      prismaMock.user.findUnique.mockResolvedValue(user as never);
      prismaMock.refreshToken.deleteMany.mockResolvedValue({
        count: 1,
      } as never);
      prismaMock.refreshToken.create.mockResolvedValue({
        id: 'new-token-id',
      } as never);
      vi.mocked(jwt.sign).mockReturnValue('new-jwt' as never);
      const result = await AuthService.refresh('old-jwt');
      expect(result.accessToken).toBe('new-jwt');
      expect(result.refreshToken).toBe('new-jwt');
      expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalled();
      expect(prismaMock.refreshToken.create).toHaveBeenCalled();
    });

    it('rejects a previously consumed refresh token', async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'usr_123',
        jti: 'nonce',
      } as never);
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);
      await expect(AuthService.refresh('reused-token')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('revokes refresh cookie token during logout', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({
        count: 1,
      } as never);
      await AuthService.logout('old-jwt');
      expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should return user info and tokens on valid credentials', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'Password123!',
      };
      const mockUser = {
        id: 'usr_123',
        email: loginInput.email,
        password: 'hashed_password',
        name: 'Test User',
        role: 'USER',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as never);
      prismaMock.refreshToken.create.mockResolvedValue({
        id: 'token_123',
        tokenHash: 'hashed_refresh',
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed_refresh_token' as never);
      vi.mocked(jwt.sign).mockReturnValue('mock_token' as never);
      redisMock.setex.mockResolvedValue('OK');

      const result = await AuthService.login(loginInput);

      expect(decryptPassword).toHaveBeenCalledWith(loginInput.password);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'Password123!',
        mockUser.password,
      );
      expect(result.user.id).toBe('usr_123');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prismaMock.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw an error if password is invalid', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };
      prismaMock.user.findUnique.mockResolvedValue({
        password: 'hashed_password',
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(AuthService.login(loginInput)).rejects.toThrow(
        'Invalid email or password',
      );
      expect(decryptPassword).toHaveBeenCalledWith('WrongPassword');
    });
  });
});
