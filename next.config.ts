import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root: a stray package-lock.json in $HOME otherwise confuses
  // Next's automatic workspace-root detection.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // Next 16 requires declaring the allowed image qualities up front.
    qualities: [75, 90],
    // Sanity CDN serves the product photos uploaded in the Studio.
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
};

export default nextConfig;
