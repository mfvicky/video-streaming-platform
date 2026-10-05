import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/v1`,
  withCredentials: true,
});

// Request interceptor: Attach JWT and Request Correlation ID
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Attached JWT to request headers', config.headers);
  }
  
  // Attach unique Request ID for log tracing
  config.headers['X-Request-ID'] = uuidv4();
  return config;
});

// Response interceptor: Handle Unauthorized (401) & Forbidden (403) responses globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    
    // Redirect to login if token is expired (401) or invalid/forbidden (403)
    if (status === 401 || status === 403) {
      localStorage.removeItem('accessToken');
      
      // Avoid infinite redirects if already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);