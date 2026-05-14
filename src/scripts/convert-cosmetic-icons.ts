import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose, { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import {
  CosmeticModel,
  type CosmeticRecord,
  type CosmeticSlot,
  UserCosmeticModel,
  type UserCosmeticRecord,
  UserModel,
  type UserRecord,
} from "@/lib/models";

type IconMigration = {
  code: string;
  slot: CosmeticSlot;
  oldIcon: string;
  newIcon: string;
};

const ICON_MIGRATIONS: IconMigration[] = [
  {
    code: "prefix_crown",
    slot: "prefix",
    oldIcon: "👑",
    newIcon: "/cosmetics/prefix-crown.png",
  },
  {
    code: "prefix_sword",
    slot: "prefix",
    oldIcon: "⚔️",
    newIcon: "/cosmetics/prefix-sword.png",
  },
  {
    code: "prefix_fire",
    slot: "prefix",
    oldIcon: "🔥",
    newIcon: "/cosmetics/prefix-fire.png",
  },
  {
    code: "prefix_shield",
    slot: "prefix",
    oldIcon: "🛡️",
    newIcon: "/cosmetics/prefix-shield.png",
  },
  {
    code: "prefix_moon",
    slot: "prefix",
    oldIcon: "🌙",
    newIcon: "/cosmetics/prefix-moon.png",
  },
  {
    code: "prefix_lotus",
    slot: "prefix",
    oldIcon: "🪷",
    newIcon: "/cosmetics/prefix-lotus.png",
  },
  {
    code: "suffix_sparkle",
    slot: "suffix",
    oldIcon: "✨",
    newIcon: "/cosmetics/suffix-sparkle.png",
  },
  {
    code: "suffix_trophy",
    slot: "suffix",
    oldIcon: "🏆",
    newIcon: "/cosmetics/suffix-trophy.png",
  },
  {
    code: "suffix_leaf",
    slot: "suffix",
    oldIcon: "🍃",
    newIcon: "/cosmetics/suffix-leaf.png",
  },
  {
    code: "suffix_wave",
    slot: "suffix",
    oldIcon: "🌊",
    newIcon: "/cosmetics/suffix-wave.png",
  },
  {
    code: "suffix_snow",
    slot: "suffix",
    oldIcon: "❄️",
    newIcon: "/cosmetics/suffix-snow.png",
  },
  {
    code: "suffix_heart",
    slot: "suffix",
    oldIcon: "💖",
    newIcon: "/cosmetics/suffix-heart.png",
  },
];

type CosmeticSnapshot = Pick<
  CosmeticRecord,
  "_id" | "code" | "name" | "slot" | "payload" | "active"
>;

type UserCosmeticSnapshot = Pick<
  UserCosmeticRecord,
  "_id" | "userId" | "cosmeticId"
>;

type UserEquippedSnapshot = Pick<UserRecord, "_id" | "fullName"> & {
  equippedCosmetics?: Partial<Record<CosmeticSlot, Types.ObjectId | null>>;
};

type MigrationReport = {
  code: string;
  oldIcon: string;
  newIcon: string;
  canonicalId: string | null;
  legacyIds: string[];
  ownedUsers: number;
  equippedUsers: number;
  iconNeedsUpdate: boolean;
  ownershipMoves: number;
  ownershipDedupes: number;
  equipMoves: number;
};

function hasArg(name: string) {
  return process.argv.includes(name);
}

function getMongoUri() {
  return process.env.MONGODB_URI ?? process.env.DATABASE_URL ?? "";
}

function maskMongoUri(uri: string) {
  return uri
    .replace(/\/\/([^/@]+)@/, "//***@")
    .replace(/([?&](?:authSource|replicaSet|retryWrites|w)=)[^&]+/g, "$1***");
}

function isLocalMongoUri(uri: string) {
  return /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i.test(uri);
}

function assertApplyIsAllowed(shouldApply: boolean) {
  if (!shouldApply) return;

  const uri = getMongoUri();
  if (!uri) {
    throw new Error("Thiếu MONGODB_URI/DATABASE_URL.");
  }

  if (isLocalMongoUri(uri)) return;

  if (!hasArg("--confirm-production")) {
    throw new Error(
      [
        "Apply mode đang trỏ tới MongoDB không phải localhost.",
        `DB: ${maskMongoUri(uri)}`,
        "Nếu đây là production đúng chủ đích, chạy lại với --apply --confirm-production.",
      ].join("\n"),
    );
  }
}

function formatIds(ids: string[]) {
  return ids.length > 0 ? ids.join(", ") : "-";
}

async function findCosmetics(target: IconMigration) {
  const cosmetics = (await CosmeticModel.find({
    $or: [
      { code: target.code },
      { "payload.icon": target.oldIcon },
      { "payload.icon": target.newIcon },
    ],
  })
    .select({
      _id: 1,
      active: 1,
      code: 1,
      name: 1,
      payload: 1,
      slot: 1,
    })
    .lean()) as CosmeticSnapshot[];

  const canonical = cosmetics.find((cosmetic) => cosmetic.code === target.code);
  const legacy = cosmetics.filter((cosmetic) => {
    if (!canonical) return cosmetic.payload?.icon === target.oldIcon;
    if (cosmetic._id.equals(canonical._id)) return false;
    return cosmetic.payload?.icon === target.oldIcon;
  });

  return { canonical, legacy };
}

async function collectUsage(cosmeticIds: Types.ObjectId[], slot: CosmeticSlot) {
  if (cosmeticIds.length === 0) {
    return {
      equippedUsers: [] as UserEquippedSnapshot[],
      ownedEntries: [] as UserCosmeticSnapshot[],
    };
  }

  const [ownedEntries, equippedUsers] = await Promise.all([
    UserCosmeticModel.find({ cosmeticId: { $in: cosmeticIds } })
      .select({ _id: 1, cosmeticId: 1, userId: 1 })
      .lean() as Promise<UserCosmeticSnapshot[]>,
    UserModel.find({ [`equippedCosmetics.${slot}`]: { $in: cosmeticIds } })
      .select({ _id: 1, fullName: 1, equippedCosmetics: 1 })
      .lean() as Promise<UserEquippedSnapshot[]>,
  ]);

  return { equippedUsers, ownedEntries };
}

async function migrateOwnership(
  legacyId: Types.ObjectId,
  canonicalId: Types.ObjectId,
  shouldApply: boolean,
) {
  const entries = (await UserCosmeticModel.find({ cosmeticId: legacyId })
    .select({ _id: 1, cosmeticId: 1, userId: 1 })
    .lean()) as UserCosmeticSnapshot[];

  let moves = 0;
  let dedupes = 0;

  for (const entry of entries) {
    const alreadyHasCanonical = await UserCosmeticModel.exists({
      cosmeticId: canonicalId,
      userId: entry.userId,
    });

    if (alreadyHasCanonical) {
      dedupes += 1;
      if (shouldApply) {
        await UserCosmeticModel.deleteOne({ _id: entry._id });
      }
      continue;
    }

    moves += 1;
    if (shouldApply) {
      await UserCosmeticModel.updateOne(
        { _id: entry._id },
        { $set: { cosmeticId: canonicalId } },
      );
    }
  }

  return { dedupes, moves };
}

async function migrateTarget(
  target: IconMigration,
  shouldApply: boolean,
): Promise<MigrationReport> {
  const { canonical, legacy } = await findCosmetics(target);
  const trackedIds = [
    ...(canonical ? [canonical._id] : []),
    ...legacy.map((cosmetic) => cosmetic._id),
  ];
  const { equippedUsers, ownedEntries } = await collectUsage(
    trackedIds,
    target.slot,
  );

  const report: MigrationReport = {
    code: target.code,
    oldIcon: target.oldIcon,
    newIcon: target.newIcon,
    canonicalId: canonical?._id.toString() ?? null,
    legacyIds: legacy.map((cosmetic) => cosmetic._id.toString()),
    ownedUsers: new Set(ownedEntries.map((entry) => entry.userId.toString()))
      .size,
    equippedUsers: equippedUsers.length,
    iconNeedsUpdate: canonical?.payload?.icon !== target.newIcon,
    ownershipMoves: 0,
    ownershipDedupes: 0,
    equipMoves: 0,
  };

  if (!canonical) {
    return report;
  }

  if (shouldApply && report.iconNeedsUpdate) {
    await CosmeticModel.updateOne(
      { _id: canonical._id },
      { $set: { "payload.icon": target.newIcon } },
    );
  }

  for (const legacyCosmetic of legacy) {
    const ownership = await migrateOwnership(
      legacyCosmetic._id,
      canonical._id,
      shouldApply,
    );
    report.ownershipMoves += ownership.moves;
    report.ownershipDedupes += ownership.dedupes;

    const equippedResult = shouldApply
      ? await UserModel.updateMany(
          { [`equippedCosmetics.${target.slot}`]: legacyCosmetic._id },
          { $set: { [`equippedCosmetics.${target.slot}`]: canonical._id } },
        )
      : await UserModel.countDocuments({
          [`equippedCosmetics.${target.slot}`]: legacyCosmetic._id,
        });

    report.equipMoves +=
      typeof equippedResult === "number"
        ? equippedResult
        : equippedResult.modifiedCount;
  }

  return report;
}

function printReport(reports: MigrationReport[], shouldApply: boolean) {
  console.log(shouldApply ? "Apply mode: đã ghi DB." : "Dry-run: chưa ghi DB.");
  console.table(
    reports.map((report) => ({
      code: report.code,
      ownedUsers: report.ownedUsers,
      equippedUsers: report.equippedUsers,
      iconNeedsUpdate: report.iconNeedsUpdate,
      legacyIds: report.legacyIds.length,
      ownershipMoves: report.ownershipMoves,
      ownershipDedupes: report.ownershipDedupes,
      equipMoves: report.equipMoves,
    })),
  );

  const missingCanonical = reports.filter((report) => !report.canonicalId);
  if (missingCanonical.length > 0) {
    console.log("Thiếu cosmetic canonical theo code:");
    for (const report of missingCanonical) {
      console.log(`- ${report.code} (${report.oldIcon} -> ${report.newIcon})`);
    }
  }

  const legacyReports = reports.filter((report) => report.legacyIds.length > 0);
  if (legacyReports.length > 0) {
    console.log("Legacy cosmetic ids cần/đã convert:");
    for (const report of legacyReports) {
      console.log(`- ${report.code}: ${formatIds(report.legacyIds)}`);
    }
  }

  if (!shouldApply) {
    console.log("Chạy lại với --apply để cập nhật icon và chuyển user refs.");
  }
}

async function main() {
  const shouldApply = hasArg("--apply");
  assertApplyIsAllowed(shouldApply);

  await connectToDatabase();
  console.log(`DB: ${maskMongoUri(getMongoUri())}`);

  const reports: MigrationReport[] = [];
  for (const target of ICON_MIGRATIONS) {
    reports.push(await migrateTarget(target, shouldApply));
  }

  printReport(reports, shouldApply);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
