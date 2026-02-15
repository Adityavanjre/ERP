import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone',
  basePath: '/portal',
  trailingSlash: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXUS_BACKEND_URL || 'https://nexus-backend-3ukg.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
