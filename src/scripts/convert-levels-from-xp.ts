import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";
import { getLevelFromXp } from "@/lib/xp";

type UserLevelSnapshot = {
  _id: { toString(): string };
  fullName?: string;
  level?: number | null;
  totalXp?: number | null;
  username?: string | null;
};

type LevelChange = {
  id: string;
  currentLevel: number;
  expectedLevel: number;
  fullName: string;
  totalXp: number;
  username: string | null;
};

function hasArg(name: string) {
  return process.argv.includes(name);
}

function readNumberArg(name: string) {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (!value) return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Tham số ${name} phải là số nguyên dương.`);
  }

  return parsed;
}

function formatChange(change: LevelChange) {
  const username = change.username ? ` @${change.username}` : "";
  return [
    change.id,
    change.fullName + username,
    `${change.totalXp} XP`,
    `Cấp ${change.currentLevel} -> Cấp ${change.expectedLevel}`,
  ].join(" | ");
}

async function main() {
  const shouldApply = hasArg("--apply");
  const limit = readNumberArg("--limit");

  await connectToDatabase();

  const query = UserModel.find(
    {},
    {
      _id: 1,
      fullName: 1,
      level: 1,
      totalXp: 1,
      username: 1,
    },
  ).sort({ totalXp: -1, fullName: 1 });

  if (limit) {
    query.limit(limit);
  }

  const users = (await query.lean()) as unknown as UserLevelSnapshot[];

  const changes = users.flatMap((user): LevelChange[] => {
    const totalXp = Math.max(0, Math.floor(user.totalXp ?? 0));
    const currentLevel = Math.max(1, Math.floor(user.level ?? 1));
    const expectedLevel = getLevelFromXp(totalXp);

    if (currentLevel === expectedLevel) {
      return [];
    }

    return [
      {
        id: user._id.toString(),
        currentLevel,
        expectedLevel,
        fullName: user.fullName ?? "Không tên",
        totalXp,
        username: user.username ?? null,
      },
    ];
  });

  console.log(`Đã kiểm tra ${users.length} user.`);
  console.log(`Cần cập nhật ${changes.length} user theo totalXp.`);

  for (const change of changes.slice(0, 50)) {
    console.log(formatChange(change));
  }

  if (changes.length > 50) {
    console.log(`... còn ${changes.length - 50} user khác.`);
  }

  if (!shouldApply) {
    console.log("Dry-run: chưa ghi DB. Chạy lại với --apply để cập nhật level.");
    return;
  }

  if (changes.length === 0) {
    console.log("Không có user nào cần cập nhật.");
    return;
  }

  const result = await UserModel.bulkWrite(
    changes.map((change) => ({
      updateOne: {
        filter: { _id: change.id },
        update: { $set: { level: change.expectedLevel } },
      },
    })),
  );

  console.log(`Đã cập nhật ${result.modifiedCount} user.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
