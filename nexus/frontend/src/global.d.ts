export {};

declare global {
  interface Window {
    nexusDesktop?: {
      shell?: {
        isDesktop?: boolean;
        getNetworkIPs?: () => Promise<string[]>;
      };
      sync?: {
        execute: () => Promise<unknown>;
        status: () => Promise<unknown>;
        resolve: (conflicts: unknown[]) => Promise<unknown>;
      };
      auth?: {
        getToken: () => Promise<string | null>;
        setToken: (token: string) => Promise<void>;
        clearToken: () => Promise<void>;
        logout?: () => Promise<void>;
        login?: (credentials: Record<string, unknown>) => Promise<{
          error?: boolean;
          message?: string;
          data: {
            user: Record<string, unknown>;
            accessToken: string;
          };
        }>;
        localOnboarding?: (data: Record<string, unknown>) => Promise<{ error?: string; success?: boolean }>;
      };
      settings?: {
        updateModules: (modules: string[]) => Promise<void>;
      };
      session?: {
        get: () => Promise<unknown>;
        set: (session: unknown) => Promise<unknown>;
        clear: () => Promise<void>;
      };
      offline?: {
        isOnline: () => Promise<boolean>;
      };
      db?: {
        query: (sql: string, params?: unknown[]) => Promise<unknown>;
      };
      localData?: {
        get: () => Promise<unknown>;
        set: (state: unknown) => Promise<unknown>;
        reset: () => Promise<unknown>;
      };
      analytics?: {
        track: (
          eventType: string,
          eventName: string,
          metadata?: unknown,
        ) => Promise<void>;
        getStats: () => Promise<unknown>;
        getEvents: (since?: string) => Promise<unknown>;
      };
    };
  }
}
