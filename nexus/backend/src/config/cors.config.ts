import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * CORS Configuration
 * 
 * Development: Allows localhost for development flexibility
 * Production: Restricted to known domains only
 */
const allowedOrigins: (string | RegExp)[] = [
  'https://klypso.in',
  'https://www.klypso.in',
  'https://portal.klypso.in',
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // LAN access
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,   // Private network
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/, // Private network
  );
}

function isOriginAllowed(origin: string | undefined, allowed: (string | RegExp)[]): boolean {
  if (!origin) return false;
  return allowed.some((a) => {
    if (typeof a === 'string') return origin === a;
    return a.test(origin);
  });
}

export const corsConfig: CorsOptions = {
  origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment || isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Device-Id',
    'X-Device-Name',
  ],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
};

/**
 * Returns allowed origins array (for logging/initialization)
 */
export function getAllowedOrigins(): (string | RegExp)[] {
  return allowedOrigins;
}
