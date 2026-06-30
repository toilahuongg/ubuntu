import type { CosmeticSlot } from "@/lib/models";

export const AVATAR_FRAME_CODE_PREFIX = "avatar_frame_";

export function shouldRepairAvatarFrameSlot({
  code,
  slot,
}: {
  code: string;
  slot: CosmeticSlot;
}): boolean {
  return code.startsWith(AVATAR_FRAME_CODE_PREFIX) && slot !== "avatarFrame";
}
