import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CI typechecks in a separate step.
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      { source: "/registry", destination: "/", permanent: true },
      // The stack builder and inspector became the canvas.
      { source: "/stack", destination: "/canvas", permanent: true },
      { source: "/inspect", destination: "/canvas", permanent: true },
    ];
  },
};

export default nextConfig;
