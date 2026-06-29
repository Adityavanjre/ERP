import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * CORS Configuration
 * 
 * Development: Allows localhost for development flexibility
 * Production: Restricted to known domains only
 */
export const corsConfig: CorsOptions = (req, callback) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const origin = req.header('Origin');
  
  // Production: Restrict to known domains
  const allowedOrigins = [
    'https://klypso.in',
    'https://www.klypso.in',
    'https://portal.klypso.in',
  ];

  // Development: Allow localhost
  if (isDevelopment) {
    allowedOrigins.push(
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // LAN access
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,   // Private network
      /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/, // Private network
    );
  }

  const isAllowed = allowedOrigins.some((allowed) => {
    if (typeof allowed === 'string') {
      return origin === allowed;
    }
    return allowed.test(origin || '');
  });

  callback(null, {
    origin: isAllowed,
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
  });
};

/**
 * Returns allowed origins array (for logging/initialization)
 */
export function getAllowedOrigins(): (string | RegExp)[] {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigins: (string | RegExp)[] = [
    'https://klypso.in',
    'https://www.klypso.in',
    'https://portal.klypso.in',
  ];

  if (isDevelopment) {
    allowedOrigins.push(
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // LAN access
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,   // Private network
      /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/, // Private network
    );
  }

  return allowedOrigins;
}
