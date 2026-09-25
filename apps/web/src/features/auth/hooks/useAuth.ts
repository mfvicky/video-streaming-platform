import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../api/auth.api';
import type { LoginInput, RegisterInput } from '@app/shared';

export const useLogin = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      toast.success('Welcome back to StreamVerse!');
      navigate('/');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Invalid login credentials';
      toast.error(message);
      console.log(error)
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    onSuccess: () => {
      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
    },
  });
};