import type { NextConfig } from "next";

const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  // GitHub Pages serves a static export. The normal build remains the
  // Cloudflare/Vinext worker build used by the existing Sites publication.
  ...(isGithubPagesBuild
    ? {
        output: "export" as const,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
