import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL+'/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: Attach JWT and Request Correlation ID
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Attach unique Request ID for log tracing
  config.headers['X-Request-ID'] = uuidv4();
  return config;
});

// Response interceptor: Handle Unauthorized responses globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);