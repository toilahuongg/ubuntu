import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import {
  COSMETIC_RARITIES,
  COSMETIC_SLOTS,
  type CosmeticRarity,
  type CosmeticRecord,
  type CosmeticSlot,
  CosmeticModel,
  UserCosmeticModel,
} from "@/lib/models";

export type CosmeticInput = {
  code: string;
  name: string;
  description?: string;
  slot: CosmeticSlot;
  rarity: CosmeticRarity;
  icon?: string | null;
  cssClass?: string | null;
  gradient?: string[] | null;
  cost: number | null;
  unlockLevel: number | null;
  active?: boolean;
};

function validate(input: CosmeticInput): void {
  if (!input.code?.trim()) throw new Error("Thiếu mã trang bị.");
  if (!input.name?.trim()) throw new Error("Thiếu tên trang bị.");
  if (!COSMETIC_SLOTS.includes(input.slot)) {
    throw new Error("Slot không hợp lệ.");
  }
  if (!COSMETIC_RARITIES.includes(input.rarity)) {
    throw new Error("Độ hiếm không hợp lệ.");
  }
  if (input.cost !== null && input.cost < 0) {
    throw new Error("Giá không hợp lệ.");
  }
  if (input.unlockLevel !== null && input.unlockLevel < 1) {
    throw new Error("Mốc level không hợp lệ.");
  }
}

function toPayload(input: CosmeticInput) {
  return {
    icon: input.icon?.trim() || null,
    cssClass: input.cssClass?.trim() || null,
    gradient:
      input.gradient && input.gradient.length > 0 ? input.gradient : null,
  };
}

export async function listAllCosmetics(): Promise<CosmeticRecord[]> {
  await connectToDatabase();
  return (await CosmeticModel.find({})
    .sort({ active: -1, slot: 1, rarity: 1, cost: 1 })
    .lean()) as CosmeticRecord[];
}

export async function createCosmetic(
  input: CosmeticInput,
): Promise<CosmeticRecord> {
  validate(input);
  await connectToDatabase();
  const existing = await CosmeticModel.findOne({ code: input.code.trim() });
  if (existing) throw new Error("Mã trang bị đã tồn tại.");
  const doc = await CosmeticModel.create({
    code: input.code.trim(),
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    slot: input.slot,
    rarity: input.rarity,
    payload: toPayload(input),
    cost: input.cost,
    unlockLevel: input.unlockLevel,
    active: input.active ?? true,
  });
  return doc.toObject() as CosmeticRecord;
}

export async function updateCosmetic(
  id: string,
  input: CosmeticInput,
): Promise<CosmeticRecord> {
  validate(input);
  if (!Types.ObjectId.isValid(id)) throw new Error("ID không hợp lệ.");
  await connectToDatabase();
  const updated = (await CosmeticModel.findByIdAndUpdate(
    id,
    {
      $set: {
        code: input.code.trim(),
        name: input.name.trim(),
        description: input.description?.trim() ?? "",
        slot: input.slot,
        rarity: input.rarity,
        payload: toPayload(input),
        cost: input.cost,
        unlockLevel: input.unlockLevel,
        active: input.active ?? true,
      },
    },
    { new: true },
  ).lean()) as CosmeticRecord | null;
  if (!updated) throw new Error("Trang bị không tồn tại.");
  return updated;
}

export async function setCosmeticActive(
  id: string,
  active: boolean,
): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw new Error("ID không hợp lệ.");
  await connectToDatabase();
  await CosmeticModel.updateOne({ _id: id }, { $set: { active } });
}

export async function grantCosmeticToUser(
  userId: string,
  cosmeticId: string,
): Promise<void> {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(cosmeticId)) {
    throw new Error("ID không hợp lệ.");
  }
  await connectToDatabase();
  const cosmetic = await CosmeticModel.findById(cosmeticId).lean();
  if (!cosmetic) throw new Error("Trang bị không tồn tại.");
  const existing = await UserCosmeticModel.exists({ userId, cosmeticId });
  if (existing) throw new Error("Người dùng đã sở hữu trang bị này.");
  await UserCosmeticModel.create({
    userId,
    cosmeticId,
    acquiredVia: "admin_grant",
  });
}
