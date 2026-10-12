import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML/CSS/JS in out/: no server needed to host the page.
  output: "export",
  // Emits /index.html style paths, which every static host serves without rewrites.
  trailingSlash: true,
  // Explicit, so a future edit can't silently publish source maps.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
