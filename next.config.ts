import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is intentionally left off for the MVP: almost every page is
  // personalised (it reads the session cookie) and shows live data, so classic
  // per-request rendering is simpler to reason about. See docs/ARCHITECTURE.md.
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
