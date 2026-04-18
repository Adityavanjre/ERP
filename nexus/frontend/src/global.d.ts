export {};

declare global {
  interface Window {
    nexusDesktop?: {
      shell?: {
        isDesktop?: boolean;
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
