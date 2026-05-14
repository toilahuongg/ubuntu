import {
  COSMETIC_SLOTS,
  type CosmeticSlot,
} from "@/lib/models/cosmetic-types";
import type { CosmeticRecord } from "@/lib/models/cosmetic";
import type { EquippedCosmeticsMap } from "@/lib/services/cosmetics-service";

export type CosmeticView = {
  id: string;
  code: string;
  slot: CosmeticSlot;
  name: string;
  rarity: string;
  icon: string | null;
  cssClass: string | null;
  gradient: string[] | null;
};

export type EquippedView = Partial<Record<CosmeticSlot, CosmeticView | null>>;

export function serializeCosmetic(cosmetic: CosmeticRecord): CosmeticView {
  return {
    id: cosmetic._id.toString(),
    code: cosmetic.code,
    slot: cosmetic.slot as CosmeticSlot,
    name: cosmetic.name,
    rarity: cosmetic.rarity,
    icon: cosmetic.payload?.icon ?? null,
    cssClass: cosmetic.payload?.cssClass ?? null,
    gradient: cosmetic.payload?.gradient ?? null,
  };
}

export function serializeEquipped(map: EquippedCosmeticsMap): EquippedView {
  const out: EquippedView = {};
  for (const slot of COSMETIC_SLOTS) {
    const c = map[slot];
    out[slot] = c ? serializeCosmetic(c) : null;
  }
  return out;
}

export const COSMETIC_CSS_WHITELIST = new Set([
  "cn-glow",
  "cn-shimmer",
  "cn-pulse",
  "cn-rainbow",
  "cn-gradient-gold",
  "cn-gradient-rainbow",
  "cn-gradient-neon",
  "cn-gradient-fire",
]);
