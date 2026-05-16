import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: { allowedOrigins: ["tv.thorsteinson.com"] },
  },
};

export default nextConfig;
