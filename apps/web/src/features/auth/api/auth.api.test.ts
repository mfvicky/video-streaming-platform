import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from './auth.api';
import { apiClient } from '../../../lib/axios';
import { encryptPassword } from '../../../utils/crypto';
import type { LoginInput, RegisterInput, AuthResponse } from '@app/shared';

// Mock apiClient and encryptPassword utility
vi.mock('../../../lib/axios', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock('../../../utils/crypto', () => ({
  encryptPassword: vi.fn((password: string) => `encrypted_${password}`),
}));

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('encrypts password and posts credentials to /auth/login', async () => {
      const credentials: LoginInput = {
        email: 'test@example.com',
        password: 'plainPassword123',
      };

      const mockResponse: AuthResponse = {
        accessToken: 'mock-access-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      };

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockResponse });

      const result = await authApi.login(credentials);

      expect(encryptPassword).toHaveBeenCalledWith('plainPassword123');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'encrypted_plainPassword123',
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates API client error during login failure', async () => {
      const credentials: LoginInput = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      const mockError = new Error('Invalid credentials');
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(mockError);

      await expect(authApi.login(credentials)).rejects.toThrow('Invalid credentials');
      expect(encryptPassword).toHaveBeenCalledWith('wrongPassword');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'encrypted_wrongPassword',
      });
    });
  });

  describe('register', () => {
    it('encrypts password and posts registration data to /auth/register', async () => {
      const registerData: RegisterInput = {
        email: 'newuser@example.com',
        password: 'securePassword123',
        name: 'New User',
        role: 'CREATOR',
      };

      const mockResponse = { message: 'User registered successfully' };
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockResponse });

      const result = await authApi.register(registerData);

      expect(encryptPassword).toHaveBeenCalledWith('securePassword123');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'newuser@example.com',
        password: 'encrypted_securePassword123',
        name: 'New User',
        role: 'CREATOR',
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates API client error during registration failure', async () => {
      const registerData: RegisterInput = {
        email: 'existing@example.com',
        password: 'securePassword123',
        role: 'USER',
        name: 'Existing User',
      };

      const mockError = new Error('Email already exists');
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(mockError);

      await expect(authApi.register(registerData)).rejects.toThrow('Email already exists');
      expect(encryptPassword).toHaveBeenCalledWith('securePassword123');
    });
  });
});