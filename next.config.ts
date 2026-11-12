import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Fonts and images read from disk by the shared-link preview image.
  outputFileTracingIncludes: { "/r/[token]/opengraph-image": ["./src/assets/og/**"] },
  experimental: {
    // Keep recently visited (dynamic) screens in the browser for 30s, so moving
    // between tabs is instant. Server Actions clear this cache on every write.
    staleTimes: { dynamic: 30 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
