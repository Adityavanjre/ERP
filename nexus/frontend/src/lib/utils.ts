import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a path with the portal basePath for correct routing.
 * Next.js is configured with basePath: '/portal', so all routes are automatically prefixed.
 * This helper ensures consistent path handling in both desktop and cloud environments.
 */
export function resolvePortalPath(path: string): string {
  // basePath is /portal, so /dashboard becomes /portal/dashboard
  return path;
}
