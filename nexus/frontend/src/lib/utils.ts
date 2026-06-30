import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a path with the portal basePath for hard navigations (window.location.href).
 * Next.js basePath is '/portal', so '/dashboard' must become '/portal/dashboard'
 * when using window.location.href directly (not router.push which handles it automatically).
 */
export function resolvePortalPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/portal';
  // Ensure no double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${cleanPath}`;
}
