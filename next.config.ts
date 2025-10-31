import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/push-rpc/:path*',
        destination: 'https://evm-testnet.flowscan.io/:path*',
      },
    ];
  },
  // Allow external images if needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
