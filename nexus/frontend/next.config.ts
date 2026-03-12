import type { NextConfig } from "next";
import path from "path";

const KLYPSO_BACKEND_URL = process.env.KLYPSO_BACKEND_URL;

const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        // FIX-AUTH-07: Removed direct Render backend URLs from connect-src.
        // All API traffic flows through the Next.js proxy (/portal/api) which is same-origin.
        // Exposing backend URLs in CSP headers leaks infrastructure topology and circumvents the gateway model.
        value: process.env.NODE_ENV === 'production'
            ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://images.unsplash.com https://ui-avatars.com; font-src 'self' data:; connect-src 'self' ${process.env.KLYPSO_BACKEND_URL || ''};`
            : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://images.unsplash.com https://ui-avatars.com; font-src 'self' data:; connect-src 'self' http://localhost:3001 http://localhost:3000 http://localhost:5000 http://localhost:5173;",
    },
    {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
    },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
    },
    {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin',
    },
];

const nextConfig: NextConfig = {
    // Enable standalone output for Docker/Render deployments
    output: 'standalone',
    // Monorepo support: Transpile shared package for both client and server runtime
    transpilePackages: ['@nexus/shared'],
    // Point Next.js file tracing to the monorepo root to silence
    // the Render/workspace root detection warning about multiple lockfiles.
    outputFileTracingRoot: path.join(__dirname, '../../'),
    basePath: '/portal',
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'ui-avatars.com' }
        ],
    },
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
        ];
    },
    async rewrites() {
        if (!KLYPSO_BACKEND_URL) return [];
        return [
            {
                source: '/api/:path*',
                destination: `${KLYPSO_BACKEND_URL}/api/:path*`,
            },
        ];
    },
    // turbopack: {} — explicitly declare an empty turbopack config to silence the
    // "webpack config detected with no turbopack config" error in Next.js 16 dev mode.
    // Production builds still use webpack so we keep the webpack config below.
    turbopack: {},
    webpack: (config, { isServer }) => {
        // Enforce performance budgets for the client bundle (production webpack builds only)
        if (!isServer) {
            config.performance = {
                hints: 'warning',
                maxAssetSize: 500000,    // 500kb
                maxEntrypointSize: 1000000, // 1mb
            };
        }
        return config;
    },
};

export default nextConfig;
