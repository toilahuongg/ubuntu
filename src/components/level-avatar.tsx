import Image from "next/image";

import { getCosmeticImageIcon } from "@/lib/cosmetics/icon";
import type { EquippedView } from "@/lib/cosmetics/serialize";

type LevelAvatarProps = {
  src: string;
  alt: string;
  equipped?: EquippedView | null;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: number;
  frameInset?: string;
};

export function LevelAvatar({
  src,
  alt,
  equipped,
  className,
  imageClassName,
  priority,
  size = 96,
  frameInset = "18%",
}: LevelAvatarProps) {
  const frameSrc = getCosmeticImageIcon(equipped?.avatarFrame?.icon);
  const framePadding = frameInset;

  if (frameSrc) {
    const avatarSize = size * (1 - 2 * parseFloat(frameInset) / 100);
    return (
      <span
        className={["relative inline-flex shrink-0 items-center justify-center", className]
          .filter(Boolean)
          .join(" ")}
        style={{ width: size, height: size }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ padding: framePadding, width: size, height: size }}
        >
          <Image
            src={src}
            alt={alt}
            width={Math.round(avatarSize)}
            height={Math.round(avatarSize)}
            priority={priority}
            className="rounded-full object-cover"
          />
        </div>
        <Image
          src={frameSrc}
          alt=""
          aria-hidden
          fill
          sizes={`${size}px`}
          className="pointer-events-none absolute inset-0 z-10 object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={["relative inline-flex shrink-0 items-center justify-center", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className={["h-full w-full object-cover", imageClassName].filter(Boolean).join(" ")}
      />
    </span>
  );
}
