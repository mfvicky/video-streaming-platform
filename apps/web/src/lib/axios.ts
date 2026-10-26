import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

const baseURL = `${import.meta.env.VITE_API_URL}/v1`;
export const apiClient = axios.create({ baseURL, withCredentials: true });
const refreshClient = axios.create({ baseURL, withCredentials: true });
interface RetryConfig extends InternalAxiosRequestConfig { _retry?: boolean }
let refreshInFlight: Promise<void> | null = null;

apiClient.interceptors.request.use((config) => {
  // HttpOnly cookies are automatically sent by the browser.
  config.headers.set('X-Request-ID', uuidv4());
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const url = original?.url ?? '';
    if (error.response?.status !== 401 || !original || original._retry ||
        /^\/auth\/(login|register|refresh|logout)(?:\?|$)/.test(url)) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshInFlight) {
        refreshInFlight = refreshClient.post('/auth/refresh').then(() => undefined)
          .finally(() => { refreshInFlight = null; });
      }
      await refreshInFlight;
      return apiClient(original);
    } catch {
      localStorage.removeItem('user'); // UI-only metadata, never a credential.
      return Promise.reject(error);
    }
  },
);
