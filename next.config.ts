import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Naikkan batas body Server Actions untuk upload foto (maks 3 × 5MB)
    serverActions: {
      bodySizeLimit: '16mb',
    },
    // Naikkan batas RSC payload agar halaman dengan banyak data tidak 1MB limit
    largePageDataBytes: 128 * 1024, // 128KB (default adalah 128KB, tapi eksplisit lebih aman)
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
