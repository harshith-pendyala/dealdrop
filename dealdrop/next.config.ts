// Source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permissive allowlist — scraped product images come from any e-commerce domain.
    // Hardening (strict allowlist) is a Phase 7 concern.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" }, // some legacy retailers still serve HTTP images
    ],
  },
};

export default nextConfig;
