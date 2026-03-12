
import axios from 'axios';

// Ensure we always target the v1 API
// PRD-001: For production grade, we use the Gateway Proxy model (/portal/api)
// This eliminates CORS delays and masks the internal backend URL.
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/portal/api';
const API_URL = baseURL.endsWith('/') ? `${baseURL}v1` : `${baseURL}/v1`;

// PERF-001: Zero-Latency Caching Layer
// Stores responses for frequent GET requests (like system/config) to prevent navigation lag.
const requestCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5000; // 5s freshness window

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface FailedRequest {
  resolve: (value?: unknown) => void;
  reject: (reason: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
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
  const match = document.cookie.match(
    new RegExp(
      '(?:^|; )' +
      name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') +
      '=([^;]*)'
    )
  );
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use(
  (config) => {
    // SEC-006: Authorization header injection from localStorage removed.
    // The backend now relies on HttpOnly cookies (nexus_token) sent via withCredentials: true.
    // This dramatically reduces XSS risk by keeping tokens out of reach of client-side JS.

    // FE-004: Attach the CSRF token on mutating requests so the backend CsrfGuard
    // double-submit cookie check can pass for web-channel cookie-based sessions.
    // Bearer-token requests are already CSRF-immune (CsrfGuard skips them), but
    // sending the header is harmless and activates protection for any future
    // cookie-only session paths.
    if (config.method?.toLowerCase() === 'get') {
      const cached = requestCache.get(config.url || '');
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        // Return a custom "thenable" to bypass the actual XHR.
        // We throw an object that we'll catch in the response interceptor as a 'cache-hit'.
        config.adapter = () =>
          Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: 'OK (Cache Hit)',
            headers: {},
            config,
          } as never);
      }
    }

    if (config.method && MUTATING_METHODS.has(config.method.toLowerCase())) {
      // Flush cache on mutations to ensure freshness
      requestCache.clear();
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

    // DEV-003: Soft Refresh checks for overlapping deployments mismatching old chunk caches vs backend versions
    const appVersion = response.headers['x-app-version'];
    const currentFeVersion = typeof window !== 'undefined' ? localStorage.getItem('nexus_version') : null;

    if (appVersion && typeof window !== 'undefined') {
      if (!currentFeVersion) {
        localStorage.setItem('nexus_version', appVersion);
      } else if (currentFeVersion !== appVersion) {
        console.warn(`Blue-green deployment conflict detected (Local: ${currentFeVersion}, Remote: ${appVersion}). Enacting soft refresh.`);
        localStorage.setItem('nexus_version', appVersion);
        window.location.reload();
      }
    }

    // Cache successful GET requests
    if (response.config.method?.toLowerCase() === 'get' && response.config.url) {
      requestCache.set(response.config.url, {
        data: response.data,
        timestamp: Date.now()
      });
    }

    return response;
  },
  (error) => {
    // PERF-001: Trap unhandled offline constraints to gracefully drop to Offline Mode
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-mode', { detail: 'Network unavailable' }));
      }
      return Promise.reject({
        message: 'Offline Mode: Please check your internet connection.',
        isOffline: true
      });
    }

    const originalRequest = error.config || {};

    if (error.response?.status === 401) {
      // Exempt identity-token-only routes from triggering a forced logout.
      // /auth/tenants and /auth/select-tenant are valid with an identity token;
      // errors there should NOT be treated as a global session expiry.
      const isLoginRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');
      const isIdentityFlowRequest = originalRequest.url?.includes('/auth/tenants') || originalRequest.url?.includes('/auth/select-tenant');

      // SEC-INTERCEPT-01: _retry guard prevents infinite loops.
      // Any request that has already been retried after a token refresh must not
      // re-enter the refresh cycle even if it receives another 401.
      if (typeof window !== 'undefined' && !isLoginRequest && !isIdentityFlowRequest && !originalRequest._retry) {

        const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
        const isAuthPage = authPages.some(page => window.location.pathname.includes(page));

        const isTokenExpired = error.response?.data?.code === 'TOKEN_EXPIRED';
        const isIdentityScopeError = error.response?.data?.message?.includes("A tenant-scoped token is required");
        const isForbidden = error.response?.status === 403;

        // Start Token Refresh Flow
        if (isTokenExpired && !isAuthPage && !isIdentityScopeError && !isForbidden) {
          if (isRefreshing) {
            // SEC-INTERCEPT-02: Concurrent refresh storm prevention.
            // A refresh is already in flight. Queue this request and mark it _retry
            // so that when the queued promise resolves with the new token and replays
            // the request, a subsequent 401 does NOT re-enter the refresh cycle.
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(() => {
                originalRequest._retry = true;
                // Cookie will be sent automatically
                return api(originalRequest);
              })
              .catch(_err => Promise.reject(_err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          return new Promise((resolve, reject) => {
            // Attempt to refresh token
            // Note: withCredentials is vital here because we rely on the HttpOnly nexus_refresh cookie.
            axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
              .then(({ data }) => {
                // SEC-006: Backend auto-updates cookies upon successful refresh.
                // We no longer manually update localStorage with tokens.
                if (typeof window !== 'undefined' && data.user) {
                  localStorage.setItem('k_user', JSON.stringify(data.user));
                }

                // SEC-INTERCEPT-04: Reset isRefreshing BEFORE draining the queue.
                isRefreshing = false;
                processQueue(null);
                resolve(api(originalRequest));
              })
              .catch((refreshError) => {
                isRefreshing = false;
                processQueue(refreshError);

                if (typeof window !== 'undefined') {
                  // AUTH-003: Buffer mutating payloads before evicting
                  if (MUTATING_METHODS.has(originalRequest.method?.toLowerCase()) && originalRequest.data) {
                    try {
                      localStorage.setItem(`k_draft_recovery`, JSON.stringify({
                        url: originalRequest.url,
                        method: originalRequest.method,
                        data: typeof originalRequest.data === 'string' ? JSON.parse(originalRequest.data) : originalRequest.data,
                        timestamp: Date.now()
                      }));
                    } catch { console.error("Draft buffer overflow"); }
                  }
                  localStorage.removeItem('k_user');
                  window.dispatchEvent(new CustomEvent('session-expired'));
                }
                reject(refreshError);
              });
          });
        } else if (!isAuthPage && !isIdentityScopeError && !isForbidden) {
          // Hard 401: It's NOT a token expiry, meaning it's an invalid signature,
          // revoked token, or tampered token. The user MUST log in again immediately.
          if (typeof window !== 'undefined') {
            if (MUTATING_METHODS.has(originalRequest.method?.toLowerCase()) && originalRequest.data) {
              // AUTH-003: Buffer even if it wasn't a refreshable token expiring (e.g. hard 401)
              try {
                localStorage.setItem(`k_draft_recovery`, JSON.stringify({
                  url: originalRequest.url,
                  method: originalRequest.method,
                  data: typeof originalRequest.data === 'string' ? JSON.parse(originalRequest.data) : originalRequest.data,
                  timestamp: Date.now()
                }));
              } catch {
                console.error("Draft buffer overflow: localStorage is full");
              }
            }
            localStorage.removeItem('k_user');
            window.dispatchEvent(new CustomEvent('session-expired'));
          }
        }
      }
    }
    return Promise.reject(error);
  }
);
