import type { NextConfig } from "next";

const NEXUS_BACKEND_URL = process.env.NEXUS_BACKEND_URL;

const nextConfig: NextConfig = {
    output: 'standalone',
    basePath: '/portal',
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'ui-avatars.com' }
        ],
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
