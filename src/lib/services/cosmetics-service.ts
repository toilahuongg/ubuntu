import "server-only";

import mongoose from "mongoose";
import { Types } from "mongoose";

import { getCosmeticTextIcon } from "@/lib/cosmetics/icon";
import { connectToDatabase } from "@/lib/mongoose";
import {
  COSMETIC_SLOTS,
  type CosmeticRecord,
  CosmeticModel,
  type CosmeticSlot,
  PointTransactionModel,
  UserCosmeticModel,
  type UserCosmeticRecord,
  UserModel,
  type UserRecord,
} from "@/lib/models";

export type ShopItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  slot: CosmeticSlot;
  rarity: string;
  payload: {
    icon: string | null;
    cssClass: string | null;
    gradient: string[] | null;
  };
  cost: number | null;
  unlockLevel: number | null;
  owned: boolean;
  canAfford: boolean;
  levelLocked: boolean;
  equipped: boolean;
};

export type EquippedCosmeticsMap = Partial<
  Record<CosmeticSlot, CosmeticRecord | null>
>;

export type InventoryView = {
  pointBalance: number;
  equipped: EquippedCosmeticsMap;
  owned: CosmeticRecord[];
};

function toShopItem(
  cosmetic: CosmeticRecord,
  ownedIds: Set<string>,
  equippedIds: Set<string>,
  pointBalance: number,
  userLevel: number,
): ShopItem {
  const id = cosmetic._id.toString();
  const owned = ownedIds.has(id);
  const levelLocked =
    cosmetic.unlockLevel !== null &&
    cosmetic.unlockLevel !== undefined &&
    userLevel < cosmetic.unlockLevel;
  const canAfford =
    cosmetic.cost !== null &&
    cosmetic.cost !== undefined &&
    pointBalance >= cosmetic.cost;
  return {
    id,
    code: cosmetic.code,
    name: cosmetic.name,
    description: cosmetic.description ?? "",
    slot: cosmetic.slot as CosmeticSlot,
    rarity: cosmetic.rarity,
    payload: {
      icon: cosmetic.payload?.icon ?? null,
      cssClass: cosmetic.payload?.cssClass ?? null,
      gradient: cosmetic.payload?.gradient ?? null,
    },
    cost: cosmetic.cost ?? null,
    unlockLevel: cosmetic.unlockLevel ?? null,
    owned,
    canAfford,
    levelLocked,
    equipped: equippedIds.has(id),
  };
}

async function loadUserContext(userId: string): Promise<{
  user: UserRecord;
  ownedIds: Set<string>;
  equippedIds: Set<string>;
}> {
  const user = (await UserModel.findById(userId).lean()) as UserRecord | null;
  if (!user) throw new Error("Người dùng không tồn tại.");
  const owned = (await UserCosmeticModel.find({ userId: user._id })
    .select({ cosmeticId: 1 })
    .lean()) as Pick<UserCosmeticRecord, "cosmeticId">[];
  const ownedIds = new Set(owned.map((o) => o.cosmeticId.toString()));
  const equippedIds = new Set<string>();
  const eq = (user as UserRecord & {
    equippedCosmetics?: Record<CosmeticSlot, Types.ObjectId | null>;
  }).equippedCosmetics;
  if (eq) {
    for (const slot of COSMETIC_SLOTS) {
      const v = eq[slot];
      if (v) equippedIds.add(v.toString());
    }
  }
  return { user, ownedIds, equippedIds };
}

export async function listShop(userId: string): Promise<ShopItem[]> {
  await connectToDatabase();
  const { user, ownedIds, equippedIds } = await loadUserContext(userId);
  const cosmetics = (await CosmeticModel.find({ active: true })
    .sort({ slot: 1, rarity: 1, cost: 1 })
    .lean()) as CosmeticRecord[];
  const balance =
    (user as UserRecord & { pointBalance?: number }).pointBalance ?? 0;
  return cosmetics.map((c) =>
    toShopItem(c, ownedIds, equippedIds, balance, user.level ?? 1),
  );
}

export async function getInventory(userId: string): Promise<InventoryView> {
  await connectToDatabase();
  const user = (await UserModel.findById(userId).lean()) as UserRecord | null;
  if (!user) throw new Error("Người dùng không tồn tại.");

  const ownedEntries = (await UserCosmeticModel.find({ userId: user._id })
    .lean()) as UserCosmeticRecord[];
  const cosmeticIds = ownedEntries.map((e) => e.cosmeticId);
  const cosmetics = (await CosmeticModel.find({
    _id: { $in: cosmeticIds },
  }).lean()) as CosmeticRecord[];
  const cosmeticMap = new Map(cosmetics.map((c) => [c._id.toString(), c]));

  const eq = (user as UserRecord & {
    equippedCosmetics?: Record<CosmeticSlot, Types.ObjectId | null>;
  }).equippedCosmetics;
  const equipped: EquippedCosmeticsMap = {};
  for (const slot of COSMETIC_SLOTS) {
    const ref = eq?.[slot];
    equipped[slot] = ref ? cosmeticMap.get(ref.toString()) ?? null : null;
  }

  return {
    pointBalance:
      (user as UserRecord & { pointBalance?: number }).pointBalance ?? 0,
    equipped,
    owned: ownedEntries
      .map((e) => cosmeticMap.get(e.cosmeticId.toString()))
      .filter((c): c is CosmeticRecord => Boolean(c)),
  };
}

export async function purchase(
  userId: string,
  cosmeticId: string,
): Promise<{ pointBalance: number }> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(cosmeticId)) {
    throw new Error("Mã trang bị không hợp lệ.");
  }
  const cosmetic = (await CosmeticModel.findById(
    cosmeticId,
  ).lean()) as CosmeticRecord | null;
  if (!cosmetic || !cosmetic.active) {
    throw new Error("Trang bị không tồn tại hoặc đã ngưng bán.");
  }
  if (cosmetic.cost === null || cosmetic.cost === undefined) {
    throw new Error("Trang bị này không thể mua trực tiếp.");
  }
  const cost = cosmetic.cost;

  const user = (await UserModel.findById(userId).lean()) as UserRecord | null;
  if (!user) throw new Error("Người dùng không tồn tại.");
  if (
    cosmetic.unlockLevel &&
    (user.level ?? 1) < cosmetic.unlockLevel
  ) {
    throw new Error(
      `Cần đạt cấp ${cosmetic.unlockLevel} để mở khóa trang bị này.`,
    );
  }

  const alreadyOwned = await UserCosmeticModel.exists({
    userId: user._id,
    cosmeticId: cosmetic._id,
  });
  if (alreadyOwned) throw new Error("Bạn đã sở hữu trang bị này.");

  const updated = (await UserModel.findOneAndUpdate(
    { _id: user._id, pointBalance: { $gte: cost } },
    { $inc: { pointBalance: -cost } },
    { new: true },
  ).lean()) as UserRecord | null;

  if (!updated) throw new Error("Không đủ điểm để mua trang bị này.");

  try {
    await UserCosmeticModel.create({
      userId: user._id,
      cosmeticId: cosmetic._id,
      acquiredVia: "purchase",
    });
  } catch (err) {
    // Refund if inventory creation failed (e.g., duplicate race)
    await UserModel.updateOne(
      { _id: user._id },
      { $inc: { pointBalance: cost } },
    );
    throw err;
  }

  await PointTransactionModel.create({
    amount: -cost,
    description: `Mua trang bị: ${cosmetic.name}`,
    source: "cosmetic_purchase",
    sourceId: cosmetic._id,
    userId: user._id,
  });

  return {
    pointBalance:
      (updated as UserRecord & { pointBalance?: number }).pointBalance ?? 0,
  };
}

export async function equip(
  userId: string,
  slot: CosmeticSlot,
  cosmeticId: string | null,
): Promise<void> {
  await connectToDatabase();
  if (!COSMETIC_SLOTS.includes(slot)) {
    throw new Error("Slot không hợp lệ.");
  }

  if (cosmeticId === null) {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { [`equippedCosmetics.${slot}`]: null } },
    );
    return;
  }

  if (!Types.ObjectId.isValid(cosmeticId)) {
    throw new Error("Mã trang bị không hợp lệ.");
  }

  const cosmetic = (await CosmeticModel.findById(
    cosmeticId,
  ).lean()) as CosmeticRecord | null;
  if (!cosmetic) throw new Error("Trang bị không tồn tại.");
  if (cosmetic.slot !== slot) {
    throw new Error("Trang bị không thuộc slot này.");
  }

  const owned = await UserCosmeticModel.exists({
    userId,
    cosmeticId: cosmetic._id,
  });
  if (!owned) throw new Error("Bạn chưa sở hữu trang bị này.");

  await UserModel.updateOne(
    { _id: userId },
    { $set: { [`equippedCosmetics.${slot}`]: cosmetic._id } },
  );
}

export async function grantLevelUnlocks(
  userId: string | Types.ObjectId,
  newLevel: number,
  session?: mongoose.ClientSession,
): Promise<number> {
  const eligible = (await CosmeticModel.find({
    active: true,
    unlockLevel: { $lte: newLevel, $ne: null },
  })
    .select({ _id: 1 })
    .session(session ?? null)
    .lean()) as { _id: Types.ObjectId }[];

  if (eligible.length === 0) return 0;

  const alreadyOwned = (await UserCosmeticModel.find({
    userId,
    cosmeticId: { $in: eligible.map((e) => e._id) },
  })
    .select({ cosmeticId: 1 })
    .session(session ?? null)
    .lean()) as { cosmeticId: Types.ObjectId }[];
  const ownedSet = new Set(alreadyOwned.map((o) => o.cosmeticId.toString()));

  const toGrant = eligible.filter((e) => !ownedSet.has(e._id.toString()));
  if (toGrant.length === 0) return 0;

  const docs = toGrant.map((c) => ({
    userId,
    cosmeticId: c._id,
    acquiredVia: "level_unlock" as const,
  }));
  if (session) {
    await UserCosmeticModel.insertMany(docs, { session });
  } else {
    await UserCosmeticModel.insertMany(docs);
  }

  return toGrant.length;
}

export async function getDecoratedFullName(
  userId: string | Types.ObjectId,
  fullName: string,
): Promise<string> {
  const map = await getEquippedPayloadsForUsers([userId.toString()]);
  const eq = map.get(userId.toString());
  if (!eq) return fullName;
  const prefix = getCosmeticTextIcon(eq.prefix?.payload?.icon) ?? "";
  const suffix = getCosmeticTextIcon(eq.suffix?.payload?.icon) ?? "";
  const left = prefix ? `${prefix} ` : "";
  const right = suffix ? ` ${suffix}` : "";
  return `${left}${fullName}${right}`;
}

export async function getEquippedPayloadsForUsers(
  userIds: string[],
): Promise<Map<string, EquippedCosmeticsMap>> {
  if (userIds.length === 0) return new Map();
  await connectToDatabase();
  const users = (await UserModel.find({ _id: { $in: userIds } })
    .select({ equippedCosmetics: 1 })
    .lean()) as (Pick<UserRecord, "_id"> & {
    equippedCosmetics?: Record<CosmeticSlot, Types.ObjectId | null>;
  })[];

  const allIds = new Set<string>();
  users.forEach((u) => {
    const eq = u.equippedCosmetics;
    if (!eq) return;
    for (const slot of COSMETIC_SLOTS) {
      const v = eq[slot];
      if (v) allIds.add(v.toString());
    }
  });

  const cosmetics = (await CosmeticModel.find({
    _id: { $in: Array.from(allIds) },
  }).lean()) as CosmeticRecord[];
  const cosmeticMap = new Map(cosmetics.map((c) => [c._id.toString(), c]));

  const result = new Map<string, EquippedCosmeticsMap>();
  users.forEach((u) => {
    const eq = u.equippedCosmetics;
    const map: EquippedCosmeticsMap = {};
    for (const slot of COSMETIC_SLOTS) {
      const v = eq?.[slot];
      map[slot] = v ? cosmeticMap.get(v.toString()) ?? null : null;
    }
    result.set(u._id.toString(), map);
  });

  return result;
}
