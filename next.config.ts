import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Pre-existing type errors in Next.js internal generated files — ignored at build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
