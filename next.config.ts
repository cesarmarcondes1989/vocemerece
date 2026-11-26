import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // fotos chegam já reduzidas no navegador; 4mb cabe no limite de body da Vercel (4,5 MB)
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  cacheComponents: true,
  partialPrefetching: true,
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
