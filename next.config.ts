import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["morally-underdone-unread.ngrok-free.dev"],
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "radix-ui"],
  },
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60,
    pagesBufferLength: 6,
  },
};

export default nextConfig;
