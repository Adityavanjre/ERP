
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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};


/**
 * FE-004: Read a cookie value by name from document.cookie.
 * Used to extract the nexus-csrf token set by the server on login.
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

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

    // FE-004: Attach the CSRF token on mutating requests so the backend CsrfGuard
    // double-submit cookie check can pass for web-channel cookie-based sessions.
    // Bearer-token requests are already CSRF-immune (CsrfGuard skips them), but
    // sending the header is harmless and activates protection for any future
    // cookie-only session paths.
    if (config.method && MUTATING_METHODS.has(config.method.toLowerCase())) {
      const csrfToken = getCookie('nexus-csrf');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
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
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      const isLoginRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');
      if (typeof window !== 'undefined' && !isLoginRequest && !originalRequest._retry) {

        const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
        const isAuthPage = authPages.some(page => window.location.pathname.includes(page));

        const isTokenExpired = error.response?.data?.code === 'TOKEN_EXPIRED';
        const isIdentityScopeError = error.response?.data?.message?.includes("A tenant-scoped token is required");
        const isForbidden = error.response?.status === 403;

        // Start Token Refresh Flow
        if (isTokenExpired && !isAuthPage && !isIdentityScopeError && !isForbidden) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(token => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
              })
              .catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          return new Promise((resolve, reject) => {
            // Attempt to refresh token 
            // Note: withCredentials is vital here if we rely on HttpOnly nexus_refresh cookie.
            // But we might also explicitly send the token if we stored it (we rely on cookie ideally, but fallbacks are good)
            axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
              .then(({ data }) => {
                const newToken = data.accessToken;
                if (typeof window !== 'undefined') {
                  localStorage.setItem('k_token', newToken);
                  if (data.user) localStorage.setItem('k_user', JSON.stringify(data.user));
                }

                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;

                processQueue(null, newToken);
                resolve(api(originalRequest));
              })
              .catch((err) => {
                processQueue(err, null);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('k_token');
                  localStorage.removeItem('k_user');
                  window.dispatchEvent(new CustomEvent('session-expired'));
                }
                reject(err);
              })
              .finally(() => {
                isRefreshing = false;
              });
          });
        }
      }
    }
    return Promise.reject(error);
  }
);
