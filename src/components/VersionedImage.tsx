import Image from "next/image";
import type { ImageProps } from "next/image";

const APP_VERSION = process.env.npm_package_version ?? "1.0.0";

export function versionedImageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${APP_VERSION}`;
}

export function VersionedImage(props: ImageProps) {
  const src =
    typeof props.src === "string" && props.src.startsWith("/")
      ? versionedImageUrl(props.src)
      : props.src;
  return <Image {...props} src={src} />;
}