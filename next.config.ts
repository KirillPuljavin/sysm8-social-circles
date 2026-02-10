import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Azure SWA hybrid Next.js (max 250MB)
};

export default nextConfig;
