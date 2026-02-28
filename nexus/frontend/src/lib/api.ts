
import axios from 'axios';

// Ensure we always target the v1 API
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/portal/api';
const API_URL = baseURL.endsWith('/') ? `${baseURL}v1` : `${baseURL}/v1`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the JWT token to headers.
// IMPORTANT: Only set Authorization if not already explicitly set by the caller.
// This prevents the interceptor from overwriting per-request headers (e.g. in TenantSelector).
api.interceptors.request.use(
  (config) => {
    if (!config.headers.Authorization) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('k_token') : null;
      // Guard against stored strings like "undefined" or "null" from previous broken sessions
      const isValidToken = token && token !== 'undefined' && token !== 'null' && token.startsWith('ey');
      if (isValidToken) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // If Render returns a splash screen (HTML) instead of JSON for a JSON request
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html') && typeof response.data === 'string') {
      if (response.data.includes('Render') || response.data.includes('Waking up')) {
        return Promise.reject({
          message: 'Klypso is starting up. Please wait as we sync your data.',
          isWakeup: true
        });
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (typeof window !== 'undefined' && !isLoginRequest) {
        // Only trigger if we aren't already on an auth page
        const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
        const isAuthPage = authPages.some(page => window.location.pathname.includes(page));

        // Only trigger session wipe if we get an explicit TOKEN_EXPIRED code
        const isTokenExpired = error.response?.data?.code === 'TOKEN_EXPIRED';
        const isIdentityScopeError = error.response?.data?.message?.includes("A tenant-scoped token is required");
        const isForbidden = error.response?.status === 403;

        if (isTokenExpired && !isAuthPage && !isIdentityScopeError && !isForbidden) {
          localStorage.removeItem('k_token');
          localStorage.removeItem('k_user');
          window.dispatchEvent(new CustomEvent('session-expired'));
        }
      }
    }
    return Promise.reject(error);
  }
);
