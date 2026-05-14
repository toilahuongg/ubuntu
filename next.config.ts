import type { NextConfig } from "next";
import packageJson from "./package.json";

const imageVersionSearch = `?v=${packageJson.version}`;
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
