
import axios from 'axios';

// Ensure we always target the v1 API
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
const API_URL = baseURL.endsWith('/') ? `${baseURL}v1/` : `${baseURL}/v1/`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('nx_token') : null;
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
        localStorage.removeItem('nx_token');
        localStorage.removeItem('nx_user');
        window.dispatchEvent(new CustomEvent('kernel-session-expired'));
      }
    }
    return Promise.reject(error);
  }
);
