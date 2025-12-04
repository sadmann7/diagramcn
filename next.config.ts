import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Already doing typechecking as separate task in CI
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
