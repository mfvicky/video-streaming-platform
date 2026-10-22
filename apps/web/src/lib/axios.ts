import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

const baseURL = `${import.meta.env.VITE_API_URL}/v1`;
export const apiClient = axios.create({ baseURL, withCredentials: true });
// Separate instance avoids refresh-interceptor recursion.
const refreshClient = axios.create({ baseURL, withCredentials: true });
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}
let refreshInFlight: Promise<string> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  config.headers.set('X-Request-ID', uuidv4());
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const url = original?.url ?? '';
    // Never refresh after invalid credentials, forbidden ownership, or another refresh call.
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      /^\/auth\/(login|register|refresh|logout)(?:\?|$)/.test(url)
    ) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshInFlight) {
        refreshInFlight = refreshClient
          .post<{ data: { accessToken: string } }>('/auth/refresh')
          .then((response) => response.data.data.accessToken)
          .finally(() => {
            refreshInFlight = null;
          });
      }
      const newToken = await refreshInFlight;
      localStorage.setItem('accessToken', newToken);
      original.headers.set('Authorization', `Bearer ${newToken}`);
      return apiClient(original);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login')
        window.location.assign('/login');
      return Promise.reject(error);
    }
  },
);
