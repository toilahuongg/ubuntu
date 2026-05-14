import Image from "next/image";
import type { ImageProps } from "next/image";

type ImageVersionEnv = {
  NEXT_PUBLIC_ASSET_VERSION?: string;
  NEXT_PUBLIC_APP_VERSION?: string;
  npm_package_version?: string;
};

export function imageVersion(env?: ImageVersionEnv): string {
  const source = env ?? {
    NEXT_PUBLIC_ASSET_VERSION: process.env.NEXT_PUBLIC_ASSET_VERSION,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    npm_package_version: process.env.npm_package_version,
  };
  return (
    source.NEXT_PUBLIC_ASSET_VERSION ??
    source.NEXT_PUBLIC_APP_VERSION ??
    source.npm_package_version ??
    "1.0.0"
  );
}

const APP_VERSION = imageVersion({
  NEXT_PUBLIC_ASSET_VERSION: process.env.NEXT_PUBLIC_ASSET_VERSION,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  npm_package_version: process.env.npm_package_version,
});

export function versionedImageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const separator = `&`
  return `${path}${separator}v=${APP_VERSION}`;
}

export function VersionedImage(props: ImageProps) {
  const src =
    typeof props.src === "string" && props.src.startsWith("/")
      ? versionedImageUrl(props.src)
      : props.src;
  return <Image {...props} alt={props.alt} src={src} />;
}
