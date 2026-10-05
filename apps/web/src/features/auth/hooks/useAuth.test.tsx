import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useLogin, useRegister } from './useAuth';
import { authApi } from '../api/auth.api';

vi.mock('../api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
};

describe('Creator useAuth Hook', () => {
  it('placeholder test', () => {
    expect(true).toBe(true);
  });
});

describe('useAuth hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('useLogin', () => {
    it('handles successful login for a standard user', async () => {
      const mockResponse = {
        success: true,
        data: {
          accessToken: 'mock-token',
          user: { id: '1', role: 'USER', email: 'user@example.com' },
        },
      };

      vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse as never);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      act(() => {
        result.current.mutate({ email: 'user@example.com', password: 'password123' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(localStorage.getItem('accessToken')).toBe('mock-token');
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockResponse.data.user));
    });
  });

  describe('useRegister', () => {
    it('handles successful registration', async () => {
      vi.mocked(authApi.register).mockResolvedValueOnce({ success: true } as never);

      const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

      const payload = {
        email: 'newuser@example.com',
        password: 'password123',
        role: 'USER' as const,
        name: 'New User',
      };

      act(() => {
        result.current.mutate(payload);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(authApi.register).toHaveBeenCalledWith(payload);
    });
  });
});