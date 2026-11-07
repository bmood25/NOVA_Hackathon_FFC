import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Let phones on the same Wi-Fi load the dev server (camera page) by LAN IP.
  allowedDevOrigins: ["10.*.*.*", "172.*.*.*", "192.168.*.*", "*.local"],
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
