import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CI typechecks in a separate step.
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [{ source: "/registry", destination: "/", permanent: true }];
  },
};

export default nextConfig;
