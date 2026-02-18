import type { NextConfig } from "next";

const NEXUS_BACKEND_URL = process.env.NEXUS_BACKEND_URL;

const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://images.unsplash.com https://ui-avatars.com; font-src 'self' data:; connect-src 'self' https://nexus-backend-3ukg.onrender.com https://klypso-gateway.onrender.com http://localhost:3001 http://localhost:5000;",
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
    output: 'standalone',
    basePath: '/portal',
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'ui-avatars.com' }
        ],
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
        if (!NEXUS_BACKEND_URL) return [];
        return [
            {
                source: '/api/:path*',
                destination: `${NEXUS_BACKEND_URL}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
