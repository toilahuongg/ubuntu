import "server-only";

import { connectToDatabase } from "@/lib/mongoose";
import {
  UserModel,
  type UserRecord,
  XpTransactionModel,
  type XpTransactionRecord,
} from "@/lib/models";
import { toObjectId } from "@/lib/utils/ids";
import { getLevelInfo, type LevelInfo } from "@/lib/level-utils";
import { getProgressToNextLevel } from "@/lib/xp";
import type { EquippedView } from "@/lib/cosmetics/serialize";

export type UserProgress = {
  currentLevelXp: number;
  level: number;
  levelInfo: LevelInfo;
  nextLevelXp: number;
  progressXp: number;
  totalXp: number;
};

export type LeaderboardEntry = {
  fullName: string;
  id: string;
  level: number;
  levelInfo: LevelInfo;
  rank: number;
  totalXp: number;
  equipped?: EquippedView;
};

export type XpHistoryEntry = {
  amount: number;
  createdAt: string;
  description: string;
  id: string;
  source: string;
};

export async function getUserProgress(userId: string): Promise<UserProgress> {
  await connectToDatabase();

  const user = (await UserModel.findById(userId).lean()) as (UserRecord & { gender?: string }) | null;
  const totalXp = user?.totalXp ?? 0;
  const gender = user?.gender ?? "male";
  const progress = getProgressToNextLevel(totalXp);
  const levelInfo = getLevelInfo(progress.currentLevel, gender);

  return {
    currentLevelXp: progress.currentLevelXp,
    level: progress.currentLevel,
    levelInfo,
    nextLevelXp: progress.nextLevelXp,
    progressXp: progress.progressXp,
    totalXp,
  };
}

export async function getXpHistory(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<{ entries: XpHistoryEntry[]; total: number }> {
  await connectToDatabase();

  const userOid = toObjectId(userId);

  const [entries, total] = await Promise.all([
    XpTransactionModel.find({ userId: userOid })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean() as Promise<XpTransactionRecord[]>,
    XpTransactionModel.countDocuments({ userId: userOid }),
  ]);

  return {
    entries: entries.map((entry) => ({
      amount: entry.amount,
      createdAt: entry.createdAt.toISOString(),
      description: entry.description,
      id: entry._id.toString(),
      source: entry.source,
    })),
    total,
  };
}
