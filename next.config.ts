import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Configure turbopack root to suppress multiple lockfiles warning
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
