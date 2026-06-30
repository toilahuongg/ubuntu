import type { CosmeticSlot } from "@/lib/models";

export const COSMETIC_FORM_SLOTS: { value: CosmeticSlot; label: string }[] = [
  { value: "prefix", label: "Trước (icon trước tên)" },
  { value: "suffix", label: "Sau (icon sau tên)" },
  { value: "color", label: "Màu sắc" },
  { value: "effect", label: "Hiệu ứng" },
  { value: "avatarFrame", label: "Khung avatar" },
];

export function cosmeticFormPreviewMode(
  slot: CosmeticSlot,
): "avatar" | "name" {
  return slot === "avatarFrame" ? "avatar" : "name";
}

export function cosmeticSlotUsesImageIcon(slot: CosmeticSlot): boolean {
  return slot === "prefix" || slot === "suffix" || slot === "avatarFrame";
}
