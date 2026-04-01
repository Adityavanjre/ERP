import axios from 'axios';
import { handleDesktopOfflineRequest, shouldHandleDesktopOfflineRequest } from './desktop-offline';

// Ensure we always target the v1 API
// PRD-001: For production grade, we use the Gateway Proxy model (/portal/api)
// This eliminates CORS delays and masks the internal backend URL.
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/portal/api';
const API_URL = baseURL.endsWith('/') ? `${baseURL}v1` : `${baseURL}/v1`;

// PERF-001: Zero-Latency Caching Layer
// Stores responses for frequent GET requests (like system/config) to prevent navigation lag.
const requestCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30000; // 30s freshness window for zero-latency lookups

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 60000, // 60s timeout to survive DB queuing on Free Tiers
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
 * DESKTOP-SHELL: Detect if the app is running inside the Electron container.
 */
function isDesktopShell(): boolean {
  if (typeof window === 'undefined') return false;
  // Look for the nexusDesktop bridge injected by the Electron preload
  return Boolean((window as any).nexusDesktop && (window as any).nexusDesktop.shell?.isDesktop);
}

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
    // DESKTOP-OFFLINE: Zero-Auth Local Bridge Interceptor
    // If the application is in desktop-offline mode, we trap the request
    // and route it to the local SQLite/state engine instead of the cloud.
    if (shouldHandleDesktopOfflineRequest(config)) {
      config.adapter = async () => handleDesktopOfflineRequest(config);
    } 
    // DESKTOP-SHELL PROTECTION: If this is the desktop shell and we are NOT in a cloud session,
    // we must ABORT any request that isn't handled by the bridge above.
    // This prevents "cloud leakage" that creates unintended usage on Render and triggers 429s.
    else if (isDesktopShell() && !localStorage.getItem('k_cloud_sync_active')) {
      // Abort the request as "Forbidden Local Only"
      const controller = new AbortController();
      config.signal = controller.signal;
      controller.abort("Zenith Air-Gap: This request is blocked to prevent unintended cloud usage. Please enable cloud sync to allow network traffic.");
    }

    // SEC-006: Authorization header injection from localStorage removed.
    // The backend now relies on HttpOnly cookies (nexus_token) sent via withCredentials: true.
    // This dramatically reduces XSS risk by keeping tokens out of reach of client-side JS.

    // FE-004: Attach the CSRF token on mutating requests so the backend CsrfGuard
    // double-submit cookie check can pass for web-channel cookie-based sessions.
    if (config.method?.toLowerCase() === 'get') {
      const cached = requestCache.get(config.url || '');
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
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
  async (error) => {
    // RES-003: Exponential Backoff for 503 (Server Overload/Warmup)
    const config = error.config;
    if (error.response?.status === 503 && (!config._retryCount || config._retryCount < 3)) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = Math.pow(2, config._retryCount) * 1000;
      console.warn(`Resiliency: 503 detected, retrying in ${delay}ms (Attempt ${config._retryCount})`);
      await new Promise(res => setTimeout(res, delay));
      return api(config);
    }

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
      const isLoginRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');
      const isIdentityFlowRequest = originalRequest.url?.includes('/auth/tenants') || originalRequest.url?.includes('/auth/select-tenant');

      if (typeof window !== 'undefined' && !isLoginRequest && !isIdentityFlowRequest && !originalRequest._retry) {
        const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
        const isAuthPage = authPages.some(page => window.location.pathname.includes(page));

        const isTokenExpired = error.response?.data?.code === 'TOKEN_EXPIRED';
        const isIdentityScopeError = error.response?.data?.message?.includes("A tenant-scoped token is required");
        const isForbidden = error.response?.status === 403;

        if (isTokenExpired && !isAuthPage && !isIdentityScopeError && !isForbidden) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(() => {
                originalRequest._retry = true;
                return api(originalRequest);
              })
              .catch(_err => Promise.reject(_err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          return new Promise((resolve, reject) => {
            axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
              .then(({ data }) => {
                if (typeof window !== 'undefined' && data.user) {
                  localStorage.setItem('k_user', JSON.stringify(data.user));
                }
                isRefreshing = false;
                processQueue(null);
                resolve(api(originalRequest));
              })
              .catch((refreshError) => {
                isRefreshing = false;
                processQueue(refreshError);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('k_user');
                  window.dispatchEvent(new CustomEvent('session-expired'));
                }
                reject(refreshError);
              });
          });
        } else if (!isAuthPage && !isIdentityScopeError && !isForbidden) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('k_user');
            window.dispatchEvent(new CustomEvent('session-expired'));
          }
        }
      }
    }
    return Promise.reject(error);
  }
);
