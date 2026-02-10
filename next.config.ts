import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Optimized output for Azure SWA (reduces bundle size)
};

export default nextConfig;
