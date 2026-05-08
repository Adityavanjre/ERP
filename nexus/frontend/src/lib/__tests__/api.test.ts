import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { api } from "../api";
import {
  ensureNetworkConsent,
} from "../network-consent";

// Mock dependencies
jest.mock("../network-consent", () => ({
  ensureNetworkConsent: jest.fn().mockResolvedValue(undefined),
  ensureRecentUserInteraction: jest.fn().mockResolvedValue(undefined),
  isNetworkConsentError: jest.fn().mockReturnValue(false),
  isNetworkInteractionError: jest.fn().mockReturnValue(false),
}));

jest.mock("../desktop-offline", () => ({
  shouldHandleDesktopOfflineRequest: jest.fn().mockReturnValue(false),
  handleDesktopOfflineRequest: jest.fn(),
}));

describe("api interceptors and configuration", () => {
  let mockApi: MockAdapter;
  let mockAxios: MockAdapter;

  const originalLocation = window.location;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockApi = new MockAdapter(api);
    mockAxios = new MockAdapter(axios); // for the refresh token axios.post call

    // Clear mocks
    jest.clearAllMocks();

    // Reset document.cookie
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });

    // Reset window/localStorage things
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    Object.defineProperty(window, "dispatchEvent", {
      value: jest.fn(),
      writable: true,
    });
});

  afterEach(() => {
    jest.restoreAllMocks();
    mockApi.restore();
    mockAxios.restore();
    (window as unknown as Record<string, unknown>).location = originalLocation;
  });

  it("should inject CSRF token on mutating requests", async () => {
    document.cookie = "nexus-csrf=test-csrf-token";

    mockApi.onPost("/test").reply((config) => {
      return [200, { headers: config.headers }];
    });

    const response = await api.post("/test");
    expect(response.data.headers["X-CSRF-Token"]).toBe("test-csrf-token");
  });

  it("should not inject CSRF token on GET requests", async () => {
    document.cookie = "nexus-csrf=test-csrf-token";

    mockApi.onGet("/test-get").reply((config) => {
      return [200, { headers: config.headers }];
    });

    const response = await api.get("/test-get");
    expect(response.data.headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("should trigger soft refresh on x-app-version mismatch", async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue("v1");

    mockApi.onGet("/version-test").reply(200, {}, { "x-app-version": "v2" });

    await api.get("/version-test");

    expect(window.localStorage.setItem).toHaveBeenCalledWith("nexus_version", "v2");
});

  it("should not trigger soft refresh if versions match", async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue("v1");

    mockApi.onGet("/version-test").reply(200, {}, { "x-app-version": "v1" });

    await api.get("/version-test");

    expect(window.localStorage.setItem).not.toHaveBeenCalledWith("nexus_version", "v1");
    // expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("should set initial version if not present", async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    mockApi.onGet("/version-test").reply(200, {}, { "x-app-version": "v1" });

    await api.get("/version-test");

    expect(window.localStorage.setItem).toHaveBeenCalledWith("nexus_version", "v1");
    // expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("should reject with network offline payload when ERR_NETWORK", async () => {
    mockApi.onGet("/offline-test").networkError();

    await expect(api.get("/offline-test")).rejects.toEqual({
      message: "Offline Mode: Please check your internet connection.",
      isOffline: true,
    });

    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect((window.dispatchEvent as jest.Mock).mock.calls[0][0].type).toBe("offline-mode");
  });

  it("should handle 429 rate limit correctly", async () => {
    mockApi.onGet("/rate-limit").reply(429);

    await expect(api.get("/rate-limit")).rejects.toEqual({
      message: "Klypso Cloud is waking up. Please try again after 90s.",
      status: 429,
      isRateLimited: true,
    });
  });

  it("should handle 503 Server Overload correctly", async () => {
    mockApi.onGet("/wakeup").reply(503);

    await expect(api.get("/wakeup")).rejects.toEqual({
      message: "Klypso Cloud is waking up. Please wait 90 seconds and try again.",
      isWakeup: true,
    });
  });

  it("should dispatch session-expired on 401 when not on auth page", async () => {
    mockApi.onGet("/unauth").reply(401, { code: "OTHER" });

    await expect(api.get("/unauth")).rejects.toThrow();

    expect(window.localStorage.removeItem).toHaveBeenCalledWith("k_user");
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect((window.dispatchEvent as jest.Mock).mock.calls[0][0].type).toBe("session-expired");
  });

  it("should attempt token refresh on 401 TOKEN_EXPIRED", async () => {
    mockApi.onGet("/protected").replyOnce(401, { code: "TOKEN_EXPIRED" });
    mockApi.onGet("/protected").reply(200, { success: true });

    mockAxios.onPost(/\/auth\/refresh/).reply(200, { user: { id: 1 } });

    const response = await api.get("/protected");

    expect(ensureNetworkConsent).toHaveBeenCalled();
    expect(window.localStorage.setItem).toHaveBeenCalledWith("k_user", JSON.stringify({ id: 1 }));
    expect(response.data.success).toBe(true);
  });
});
