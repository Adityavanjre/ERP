import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/portal',
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://nexus-backend:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
