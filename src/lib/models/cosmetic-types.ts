export const COSMETIC_SLOTS = [
  "prefix",
  "suffix",
  "color",
  "effect",
  "avatarFrame",
] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export const COSMETIC_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
] as const;
export type CosmeticRarity = (typeof COSMETIC_RARITIES)[number];