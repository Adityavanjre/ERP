
import axios from 'axios';

// Ensure we always target the v1 API, even if the environment variable omits it
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/portal/api';
const API_URL = baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (typeof window !== 'undefined' && !isLoginRequest) {
        localStorage.removeItem('token');
        window.dispatchEvent(new CustomEvent('kernel-session-expired'));
      }
    }
    return Promise.reject(error);
  }
);
