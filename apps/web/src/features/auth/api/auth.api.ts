import { apiClient } from '../../../lib/axios';
import type { LoginInput, RegisterInput, AuthResponse } from '@app/shared';
import { encryptPassword } from '../../../utils/crypto';

export const authApi = {
  login: async (credentials: LoginInput): Promise<{ success: boolean; data: AuthResponse }> => {
    const payload: LoginInput = {
      ...credentials,
      password: encryptPassword(credentials.password),
    };
    const response = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', payload);
    return response.data;
  },

  session: async (): Promise<AuthResponse['user']> => {
    const response = await apiClient.get<{ data: AuthResponse }>('/auth/session');
    return response.data.data.user;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  register: async (data: RegisterInput): Promise<{ message: string }> => {
    const payload: RegisterInput = {
      ...data,
      password: encryptPassword(data.password),
    };

    const response = await apiClient.post<{ message: string }>(
      '/auth/register',
      payload,
    );
    return response.data;
  },
};
