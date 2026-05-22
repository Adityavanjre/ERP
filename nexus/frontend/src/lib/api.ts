import axios, { type AxiosAdapter, type AxiosResponse } from "axios";
import {
  handleDesktopOfflineRequest,
  shouldHandleDesktopOfflineRequest,
} from "./desktop-offline";
import {
  ensureNetworkConsent,
  ensureRecentUserInteraction,
  isNetworkConsentError,
  isNetworkInteractionError,
} from "./network-consent";

// Ensure we always target the v1 API
// PRD-001: For production grade, we use the Gateway Proxy model (/portal/api)
// FALLBACK: If NEXT_PUBLIC_API_URL is missing (Render.com), we default to the production cluster.
const baseURL = process.env.NEXT_PUBLIC_API_URL || "https://klypso-backend.onrender.com";
// DESKTOP-DIRECT: Force cloud backend for desktop shell to match the web browser gateway
const CLOUD_BACKEND_URL = "https://klypso-backend.onrender.com";
const API_URL = isDesktopShell()
  ? `${CLOUD_BACKEND_URL}/v1`
  : baseURL.endsWith("/")
    ? `${baseURL}v1`
    : `${baseURL}/v1`;

// PERF-001: Zero-Latency Caching Layer
// Stores responses for frequent GET requests (like system/config) to prevent navigation lag.
const requestCache = new Map<string, { data: unknown; timestamp: number }>();
const pendingRequests = new Map<string, Promise<AxiosResponse>>();
const CACHE_TTL = 30000; // 30s freshness window for zero-latency lookups
const THROTTLE_WINDOW = 500; // 500ms window to prevent sub-second duplicate bursts
let networkQueue: Promise<void> = Promise.resolve();

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 60000, // 60s timeout to survive DB queuing on Free Tiers
  headers: {
    "Content-Type": "application/json",
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

async function scheduleNetworkRequest<T>(task: () => Promise<T>): Promise<T> {
  const previousTask = networkQueue;
  let releaseQueue!: () => void;

  networkQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  await previousTask;

  // lastScheduledRequestAt was unused by consumers, removed to satisfy ESLint

  try {
    return await task();
  } finally {
    releaseQueue();
  }
}

/**
 * DESKTOP-SHELL: Detect if the app is running inside the Electron container.
 */
function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  // Look for the nexusDesktop bridge injected by the Electron preload
  return Boolean(window.nexusDesktop?.shell?.isDesktop);
}

/**
 * FE-004: Read a cookie value by name from document.cookie.
 * Used to extract the nexus-csrf token set by the server on login.
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)",
    ),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

api.interceptors.request.use(
  async (config) => {
    // DESKTOP-OFFLINE: Zero-Auth Local Bridge Interceptor
    // If the application is in desktop-offline mode, we trap the request
    // and route it to the local SQLite/state engine instead of the cloud.
    const handledOfflineRequest = shouldHandleDesktopOfflineRequest(config);
    if (handledOfflineRequest) {
      config.adapter = async () => handleDesktopOfflineRequest(config);
    }
    // DESKTOP-SHELL PROTECTION: If this is the desktop shell and we are NOT in a cloud session,
    // we must ABORT any request that isn't handled by the bridge above.
    // This prevents "cloud leakage" that creates unintended usage on Render and triggers 429s.
    else if (isDesktopShell() && !localStorage.getItem("k_cloud_sync_active")) {
      const isAuthRoute =
        config.url?.includes("auth/login") ||
        config.url?.includes("auth/register") ||
        config.url?.includes("auth/mfa") ||
        config.url?.includes("auth/google") ||
        config.url?.includes("auth/tenants") ||
        config.url?.includes("auth/select-tenant") ||
        config.url?.includes("auth/onboarding");
      if (!isAuthRoute) {
        // Abort the request as "Forbidden Local Only"
        const controller = new AbortController();
        config.signal = controller.signal;
        controller.abort(
          "Klypso Air-Gap: This request is blocked to prevent unintended cloud usage. Please enable cloud sync to allow network traffic.",
        );
        return config;
      }
    }

    if (!handledOfflineRequest) {
      await ensureNetworkConsent();
      await ensureRecentUserInteraction();
    }

    // SEC-006: Authorization header injection from localStorage removed.
    // The backend now relies on HttpOnly cookies (nexus_token) sent via withCredentials: true.
    // This dramatically reduces XSS risk by keeping tokens out of reach of client-side JS.

    // FE-004: Attach the CSRF token on mutating requests so the backend CsrfGuard
    // double-submit cookie check can pass for web-channel cookie-based sessions.
    if (config.method?.toLowerCase() === "get") {
      const cacheKey = axios.getUri(config);

      // 1. Check persistent cache
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        config.adapter = () =>
          Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: "OK (Cache Hit)",
            headers: {},
            config,
          } as never);
        return config;
      }

      // 2. Thundering Herd Deduplication
      // If a request for this exact URL is already in-flight, reuse it
      const pending = pendingRequests.get(cacheKey);
      if (pending) {
        config.adapter = () => pending;
        return config;
      }
    }

    // Attach the CSRF token on mutating requests
    if (config.method && MUTATING_METHODS.has(config.method.toLowerCase())) {
      // Flush cache on mutations to ensure freshness
      requestCache.clear();
      const csrfToken = getCookie("nexus-csrf");
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// DEDUPLICATION ADAPTER: Intercepts the low-level adapter call to prevent thundering herds.
// We cast to any to bypass the complex AxiosAdapter constituent types which can be string|[] in some versions.
const originalAdapter = api.defaults.adapter as AxiosAdapter;

api.defaults.adapter = async (config) => {
  if (config.method?.toLowerCase() !== "get" || !config.url) {
    return scheduleNetworkRequest(() => originalAdapter(config));
  }

  const cacheKey = axios.getUri(config);

  // 1. Check Persistent Cache (30s)
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      data: cached.data,
      status: 200,
      statusText: "OK (Cache Hit)",
      headers: {},
      config,
    } as AxiosResponse;
  }

  // 2. Thundering Herd Deduplication
  // If identical GET is in-flight, return its promise
  const inFlight = pendingRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  // 3. Execute and track
  const requestPromise = scheduleNetworkRequest(() => originalAdapter(config));
  pendingRequests.set(cacheKey, requestPromise);

  try {
    const response = await requestPromise;
    // Cache the result for zero-latency lookups
    requestCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
    });
    return response;
  } finally {
    // Keep in pending for a tiny bit longer (THROTTLE_WINDOW) to catch micro-bursts
    setTimeout(() => {
      pendingRequests.delete(cacheKey);
    }, THROTTLE_WINDOW);
  }
};

api.interceptors.response.use(
  (response) => {
    // If Render returns a splash screen (HTML) instead of JSON for a JSON request
    const contentType = response.headers["content-type"];
    if (
      contentType &&
      String(contentType).includes("text/html") &&
      typeof response.data === "string"
    ) {
      if (
        response.data.includes("Render") ||
        response.data.includes("Waking up")
      ) {
        return Promise.reject({
          message: "Klypso is starting up. Please wait as we sync your data.",
          isWakeup: true,
        });
      }
    }

    // DEV-003: Soft Refresh checks for overlapping deployments mismatching old chunk caches vs backend versions
    const appVersion = response.headers["x-app-version"];
    const currentFeVersion =
      typeof window !== "undefined"
        ? localStorage.getItem("nexus_version")
        : null;

    if (appVersion && typeof window !== "undefined") {
      if (!currentFeVersion) {
        localStorage.setItem("nexus_version", appVersion);
      } else if (currentFeVersion !== appVersion) {
        console.warn(
          `Blue-green deployment conflict detected (Local: ${currentFeVersion}, Remote: ${appVersion}). Enacting soft refresh.`,
        );
        localStorage.setItem("nexus_version", appVersion);
        window.location.reload();
      }
    }

    // DESKTOP-SYNC BRIDGE: Automatically trap any accessToken from JSON responses (login, switch-tenant, refresh)
    // and sync it to the Desktop Shell's native sync engine. This ensures the background sync uses the correct tenant-scoped token.
    const accessToken =
      typeof response.data === "object" && response.data !== null
        ? (response.data as { accessToken?: string }).accessToken
        : undefined;

    if (typeof accessToken === "string" && typeof window !== "undefined") {
      window.nexusDesktop?.auth?.setToken(accessToken).catch(console.error);
    }

    return response;
  },
  async (error) => {
    if (isNetworkConsentError(error)) {
      return Promise.reject({
        code: "NETWORK_CONSENT_REQUIRED",
        message: error.message,
        isConsentRequired: true,
      });
    }

    if (isNetworkInteractionError(error)) {
      return Promise.reject({
        code: "NETWORK_INTERACTION_REQUIRED",
        message: error.message,
        isInteractionRequired: true,
      });
    }

    // RES-003: 503 (Server Overload/Warmup) - No automatic retry per user request
    if (
      error.response?.status === 503 ||
      error.response?.status === 502 ||
      error.response?.status === 504
    ) {
      if (typeof window !== "undefined") {
        return Promise.reject({
          message:
            "Klypso Cloud is waking up. Please wait 90 seconds and try again.",
          isWakeup: true,
        });
      }
    }

    // PERF-001: Trap unhandled offline constraints to gracefully drop to Offline Mode
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("offline-mode", { detail: "Network unavailable" }),
        );
      }
      return Promise.reject({
        message: "Offline Mode: Please check your internet connection.",
        isOffline: true,
      });
    }

    const originalRequest = error.config || {};

    // MANUAL-ONLY: Do not auto-retry when the server rate-limits us.
    // Each new attempt should come from an explicit user action or approval.
    if (error.response?.status === 429) {
      return Promise.reject({
        message: "Klypso Cloud is waking up. Please try again after 90s.",
        status: 429,
        isRateLimited: true,
      });
    }

    if (error.response?.status === 401) {
      const isLoginRequest =
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh");
      const isIdentityFlowRequest =
        originalRequest.url?.includes("/auth/tenants") ||
        originalRequest.url?.includes("/auth/select-tenant");

      if (
        typeof window !== "undefined" &&
        !isLoginRequest &&
        !isIdentityFlowRequest &&
        !originalRequest._retry
      ) {
        const authPages = [
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ];
        const isAuthPage = authPages.some((page) =>
          window.location.pathname.includes(page),
        );

        const isTokenExpired = error.response?.data?.code === "TOKEN_EXPIRED";
        const isIdentityScopeError = error.response?.data?.message?.includes(
          "A tenant-scoped token is required",
        );
        const isForbidden = error.response?.status === 403;

        if (
          isTokenExpired &&
          !isAuthPage &&
          !isIdentityScopeError &&
          !isForbidden
        ) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(() => {
                originalRequest._retry = true;
                return api(originalRequest);
              })
              .catch((_err) => Promise.reject(_err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          return new Promise((resolve, reject) => {
            ensureNetworkConsent()
              .then(() =>
                axios.post(
                  `${API_URL}/auth/refresh`,
                  {},
                  { withCredentials: true },
                ),
              )
              .then(({ data }) => {
                if (typeof window !== "undefined" && data.user) {
                  localStorage.setItem("k_user", JSON.stringify(data.user));
                }
                isRefreshing = false;
                processQueue(null);
                resolve(api(originalRequest));
              })
              .catch((refreshError) => {
                isRefreshing = false;
                processQueue(refreshError);
                if (typeof window !== "undefined") {
                  localStorage.removeItem("k_user");
                  window.dispatchEvent(new CustomEvent("session-expired"));
                }
                reject(refreshError);
              });
          });
        } else if (!isAuthPage && !isIdentityScopeError && !isForbidden) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("k_user");
            window.dispatchEvent(new CustomEvent("session-expired"));
          }
        }
      }
    }
    return Promise.reject(error);
  },
);
