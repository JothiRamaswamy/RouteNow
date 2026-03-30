import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow streaming responses from API routes
  experimental: {
    serverComponentsExternalPackages: ["gtfs-realtime-bindings"],
  },
};

export default nextConfig;
