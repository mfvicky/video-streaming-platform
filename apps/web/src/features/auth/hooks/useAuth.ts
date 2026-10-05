import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';
import { authApi } from '../api/auth.api';
import type { LoginInput, RegisterInput, AuthResponse } from '@app/shared';

// Top-level API envelope structure returned by your backend
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const useLogin = () => {
  const navigate = useNavigate();

  return useMutation<ApiResponse<AuthResponse>, AxiosError<{ message?: string }>, LoginInput>({
    mutationFn: (data: LoginInput) =>
      authApi.login(data) as unknown as Promise<ApiResponse<AuthResponse>>,
    onSuccess: (response) => {
      console.log('Login successful, received access token:', response);
      const token = response.data.accessToken;
      localStorage.setItem('accessToken', token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Welcome back to StreamVerse!');

      if (response.data.user.role === 'CREATOR') {
        navigate('/creator');
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Invalid login credentials';
      toast.error(message);
      console.log(error);
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();

  return useMutation<unknown, AxiosError<{ message?: string }>, RegisterInput>({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    onSuccess: () => {
      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
    },
  });
};