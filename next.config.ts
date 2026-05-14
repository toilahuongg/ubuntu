import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import packageJson from "./package.json";

function getAssetVersion() {
  if (process.env.NEXT_PUBLIC_ASSET_VERSION) {
    return process.env.NEXT_PUBLIC_ASSET_VERSION;
  }
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  }
  try {
    return execSync("git rev-parse --short=12 HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return packageJson.version;
  }
}

const assetVersion = getAssetVersion();
const imageVersionSearch = `?v=${assetVersion}`;
const versionedLocalImagePaths = [
  "/icons/**",
  "/badges/**",
  "/cosmetics/**",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_ASSET_VERSION: assetVersion,
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  images: {
    localPatterns: versionedLocalImagePaths.flatMap((pathname) => [
      { pathname, search: "" },
      { pathname, search: imageVersionSearch },
    ]),
  },
  allowedDevOrigins: ["dev2.misoapps.com", "dev.misoapps.com"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
