import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone',
  basePath: '/portal',
  trailingSlash: false,
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
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
