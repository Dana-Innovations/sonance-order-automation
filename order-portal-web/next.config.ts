import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Suppress the multiple lockfiles warning by setting the root
  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
