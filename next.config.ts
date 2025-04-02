import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Static HTML export for Netlify
  images: {
    unoptimized: true, // Required for static export
  },
  // Uncomment if you're using rewrites or redirects
  // trailingSlash: true,
};

export default nextConfig;
