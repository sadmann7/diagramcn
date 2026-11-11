import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CI typechecks in a separate step.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
