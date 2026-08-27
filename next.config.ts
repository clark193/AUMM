import type { NextConfig } from "next";

// The production site is served from the root of the custom domain
// (https://aumm.com.br), so exported assets must not use the repository name
// as a URL prefix. A subpath can still be requested explicitly for previews.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
