const STORAGE_KEY = "k_network_consent_granted";
const USER_INTERACTION_WINDOW_MS = 5000;

export const NETWORK_CONSENT_REQUESTED_EVENT = "klypso:network-consent-requested";

type PendingConsent = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason: Error) => void;
};

let consentCache: boolean | null = null;
let pendingConsent: PendingConsent | null = null;
let pendingInteraction: PendingConsent | null = null;
let lastUserInteractionAt = 0;

export class NetworkConsentError extends Error {
  code = "NETWORK_CONSENT_REQUIRED";

  constructor(message = "Server access was not approved.") {
    super(message);
    this.name = "NetworkConsentError";
  }
}

export class NetworkInteractionError extends Error {
  code = "NETWORK_INTERACTION_REQUIRED";

  constructor(message = "A direct user interaction is required before contacting the server.") {
    super(message);
    this.name = "NetworkInteractionError";
  }
}

function readStoredConsent(): boolean {
  if (consentCache !== null) {
    return consentCache;
  }

  if (typeof window === "undefined") {
    consentCache = true;
    return consentCache;
  }

  try {
    consentCache = window.sessionStorage.getItem(STORAGE_KEY) === "granted";
  } catch {
    consentCache = false;
  }

  return consentCache;
}

export function hasNetworkConsent(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return readStoredConsent();
}

export function hasPendingNetworkConsentRequest(): boolean {
  return pendingConsent !== null;
}

export async function ensureNetworkConsent(): Promise<void> {
  if (typeof window === "undefined" || hasNetworkConsent()) {
    return;
  }

  if (!pendingConsent) {
    pendingConsent = {} as PendingConsent;
    pendingConsent.promise = new Promise<void>((resolve, reject) => {
      pendingConsent!.resolve = resolve;
      pendingConsent!.reject = reject;
    });
    window.dispatchEvent(new CustomEvent(NETWORK_CONSENT_REQUESTED_EVENT));
  }

  return pendingConsent.promise;
}

export function hasRecentUserInteraction(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return Date.now() - lastUserInteractionAt <= USER_INTERACTION_WINDOW_MS;
}

export function recordUserInteraction(): void {
  lastUserInteractionAt = Date.now();

  const pending = pendingInteraction;
  pendingInteraction = null;
  pending?.resolve();
}

export async function ensureRecentUserInteraction(): Promise<void> {
  if (typeof window === "undefined" || hasRecentUserInteraction()) {
    return;
  }

  if (!pendingInteraction) {
    pendingInteraction = {} as PendingConsent;
    pendingInteraction.promise = new Promise<void>((resolve, reject) => {
      pendingInteraction!.resolve = resolve;
      pendingInteraction!.reject = reject;
    });
  }

  return pendingInteraction.promise;
}

export function grantNetworkConsent(): void {
  consentCache = true;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "granted");
    } catch {
      // Ignore storage failures and keep the in-memory approval for this page lifetime.
    }
  }

  const pending = pendingConsent;
  pendingConsent = null;
  pending?.resolve();
}

export function denyNetworkConsent(): void {
  revokeNetworkConsent();

  const pending = pendingConsent;
  pendingConsent = null;
  pending?.reject(new NetworkConsentError());
}

export function revokeNetworkConsent(): void {
  consentCache = false;
  lastUserInteractionAt = 0;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }
}

export function isNetworkConsentError(error: unknown): error is NetworkConsentError {
  return error instanceof Error && (error as { code?: string }).code === "NETWORK_CONSENT_REQUIRED";
}

export function isNetworkInteractionError(error: unknown): error is NetworkInteractionError {
  return error instanceof Error && (error as { code?: string }).code === "NETWORK_INTERACTION_REQUIRED";
}
