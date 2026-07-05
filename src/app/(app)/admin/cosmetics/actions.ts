"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canManageShop } from "@/lib/permissions";
import { runAction, type ActionResult } from "@/lib/actions/result";
import {
  COSMETIC_RARITIES,
  COSMETIC_SLOTS,
  type CosmeticRarity,
  type CosmeticSlot,
} from "@/lib/models";
import {
  createCosmetic,
  grantCosmeticToUser,
  setCosmeticActive,
  updateCosmetic,
} from "@/lib/services/cosmetics-admin-service";

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageShop(session)) {
    throw new Error("Bạn không có quyền quản lý trang bị.");
  }
}

function parseGradient(value: string | null): string[] | null {
  if (!value) return null;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}

function parseNumberOrNull(value: string | null): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readCosmeticInput(formData: FormData) {
  const slot = formData.get("slot") as string;
  const rarity = formData.get("rarity") as string;
  if (!COSMETIC_SLOTS.includes(slot as CosmeticSlot)) {
    throw new Error("Slot không hợp lệ.");
  }
  if (!COSMETIC_RARITIES.includes(rarity as CosmeticRarity)) {
    throw new Error("Độ hiếm không hợp lệ.");
  }
  return {
    code: (formData.get("code") as string) ?? "",
    name: (formData.get("name") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    slot: slot as CosmeticSlot,
    rarity: rarity as CosmeticRarity,
    icon: (formData.get("icon") as string) || null,
    cssClass: (formData.get("cssClass") as string) || null,
    gradient: parseGradient(formData.get("gradient") as string | null),
    cost: parseNumberOrNull(formData.get("cost") as string | null),
    unlockLevel: parseNumberOrNull(
      formData.get("unlockLevel") as string | null,
    ),
    active: formData.get("active") !== null,
  };
}

export async function createCosmeticAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await createCosmetic(readCosmeticInput(formData));
    revalidatePath("/admin/cosmetics");
  });
}

export async function updateCosmeticAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const id = formData.get("id") as string;
    if (!id) throw new Error("Thiếu ID.");
    await updateCosmetic(id, readCosmeticInput(formData));
    revalidatePath("/admin/cosmetics");
  });
}

export async function toggleCosmeticActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await setCosmeticActive(id, active);
    revalidatePath("/admin/cosmetics");
  });
}

export async function grantCosmeticAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const userId = formData.get("userId") as string;
    const cosmeticId = formData.get("cosmeticId") as string;
    await grantCosmeticToUser(userId, cosmeticId);
    revalidatePath("/admin/cosmetics", "layout");
  });
}
