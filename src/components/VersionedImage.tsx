import Image from "next/image";
import type { ImageProps } from "next/image";

export function imageUrl(path: string): string {
  return path;
}

export function VersionedImage(props: ImageProps) {
  const src =
    typeof props.src === "string" && props.src.startsWith("/")
      ? imageUrl(props.src)
      : props.src;
  return <Image {...props} alt={props.alt} src={src} />;
}
