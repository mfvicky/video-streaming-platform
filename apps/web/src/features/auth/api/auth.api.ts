import { apiClient } from '../../../lib/axios';
import type { LoginInput, RegisterInput, AuthResponse } from '@app/shared';
import { encryptPassword } from '../../../utils/crypto';

export const authApi = {
  login: async (credentials: LoginInput): Promise<AuthResponse> => {
    const payload: LoginInput = {
      ...credentials,
      password: encryptPassword(credentials.password),
    };
    console.log(payload)
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  register: async (data: RegisterInput): Promise<{ message: string }> => {
    const payload: RegisterInput = {
      ...data,
      password: encryptPassword(data.password),
    };

    const response = await apiClient.post<{ message: string }>('/auth/register', payload);
    return response.data;
  },
};