import type { NextConfig } from "next";

const internalBase = (
  process.env.INTERNAL_API_BASE ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    // Keep resolution inside this app (not parent frontend/)
    root: process.cwd(),
  },
  experimental: {
    proxyClientMaxBodySize: "100mb",
  },
  async rewrites() {
    return [
      {
        source: "/review_images/:path*",
        destination: `${internalBase}/review_images/:path*`,
      },
      {
        source: "/review/:path*",
        destination: `${internalBase}/review/:path*`,
      },
    ];
  },
};

export default nextConfig;
