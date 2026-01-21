import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: turbopack.root warning can be ignored - Vercel handles this automatically

  // Prevent aggressive caching of pages
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
