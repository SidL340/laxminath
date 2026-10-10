import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').trim();
    const backendUrl = rawUrl.replace(/\/api\/?$/, '').trim();
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
