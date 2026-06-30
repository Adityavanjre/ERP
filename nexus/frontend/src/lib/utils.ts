import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a path with the portal basePath for correct routing.
 * Next.js is configured with basePath: '/portal', so all routes are automatically prefixed.
 * This helper ensures consistent path handling in both desktop and cloud environments.
 * For client-side navigation, Next.js handles basePath automatically.
 * For full page reloads (window.location.href), we return the path as-is since Next.js
 * will still handle the basePath prefixing on the server side.
 */
export function resolvePortalPath(path: string): string {
  // basePath is /portal, so /dashboard becomes /portal/dashboard
  // Next.js handles the prefixing automatically, so we return the path as-is
  return path;
}
