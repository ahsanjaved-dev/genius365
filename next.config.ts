import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },

  // Enable compression
  compress: true,

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Enable optimized package imports
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/react-icons"],
  },

  // Performance: Enable strict mode for React
  reactStrictMode: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ]
  },

  // Logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

export default nextConfig
