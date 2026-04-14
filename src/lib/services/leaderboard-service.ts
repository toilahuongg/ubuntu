import "server-only";

import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

import { getAppTimezone } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  PointTransactionModel,
  RegionModel,
  UserModel,
  type UserRecord,
} from "@/lib/models";
import { getLevelInfo } from "@/lib/level-utils";
import type { LeaderboardEntry } from "@/lib/services/gamification-service";

export type RegionLeaderboardEntry = {
  id: string;
  name: string;
  code: string;
  rank: number;
  totalXp: number;
  memberCount: number;
};

function getMonthStart(now = new Date()): Date {
  const tz = getAppTimezone();
  const yearMonth = formatInTimeZone(now, tz, "yyyy-MM");
  return fromZonedTime(`${yearMonth}-01T00:00:00`, tz);
}

type MonthlyXpRow = { _id: unknown; monthlyXp: number };

function toLeaderboardEntry(
  user: UserRecord,
  monthlyXp: number,
  rank: number,
): LeaderboardEntry {
  const u = user as UserRecord & { gender?: string };
  return {
    fullName: u.fullName,
    id: u._id.toString(),
    level: u.level ?? 1,
    levelInfo: getLevelInfo(u.level ?? 1, u.gender ?? "male"),
    rank,
    totalXp: monthlyXp,
  };
}

async function getTopUsersByMonthlyXp(
  filter: Record<string, unknown>,
  limit: number,
): Promise<LeaderboardEntry[]> {
  await connectToDatabase();
  const since = getMonthStart();

  const topIds = (await PointTransactionModel.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$userId", monthlyXp: { $sum: "$amount" } } },
    {
      $lookup: {
        as: "user",
        foreignField: "_id",
        from: "users",
        localField: "_id",
      },
    },
    { $unwind: "$user" },
    {
      $match: Object.fromEntries(
        Object.entries(filter).map(([k, v]) => [`user.${k}`, v]),
      ),
    },
    { $sort: { monthlyXp: -1 } },
    { $limit: limit },
  ])) as (MonthlyXpRow & { user: UserRecord })[];

  return topIds.map((row, index) =>
    toLeaderboardEntry(row.user, row.monthlyXp, index + 1),
  );
}

export async function getTopMembers(limit = 5): Promise<LeaderboardEntry[]> {
  return getTopUsersByMonthlyXp(
    { role: "MEMBER", status: "ACTIVE" },
    limit,
  );
}

export async function getTopRegionalLeads(
  limit = 3,
): Promise<LeaderboardEntry[]> {
  return getTopUsersByMonthlyXp(
    { role: "REGIONAL_LEAD", status: "ACTIVE" },
    limit,
  );
}

export async function getTopRegions(
  limit = 3,
): Promise<RegionLeaderboardEntry[]> {
  await connectToDatabase();
  const since = getMonthStart();

  const aggregated = (await PointTransactionModel.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$userId", monthlyXp: { $sum: "$amount" } } },
    {
      $lookup: {
        as: "user",
        foreignField: "_id",
        from: "users",
        localField: "_id",
      },
    },
    { $unwind: "$user" },
    { $match: { "user.regionId": { $ne: null }, "user.status": "ACTIVE" } },
    {
      $group: {
        _id: "$user.regionId",
        memberCount: { $sum: 1 },
        totalXp: { $sum: "$monthlyXp" },
      },
    },
    { $sort: { totalXp: -1 } },
    { $limit: limit },
  ])) as { _id: unknown; totalXp: number; memberCount: number }[];

  if (aggregated.length === 0) return [];

  const regionIds = aggregated.map((row) => row._id);
  const regions = (await RegionModel.find({ _id: { $in: regionIds } })
    .select({ code: 1, name: 1 })
    .lean()) as { _id: { toString(): string }; code: string; name: string }[];

  const regionMap = new Map(
    regions.map((r) => [r._id.toString(), { code: r.code, name: r.name }]),
  );

  return aggregated
    .map((row, index) => {
      const id = (row._id as { toString(): string }).toString();
      const meta = regionMap.get(id);
      if (!meta) return null;
      return {
        id,
        name: meta.name,
        code: meta.code,
        rank: index + 1,
        totalXp: row.totalXp,
        memberCount: row.memberCount,
      };
    })
    .filter((r): r is RegionLeaderboardEntry => r !== null);
}

export function getLeaderboardMonthLabel(now = new Date()): string {
  return formatInTimeZone(now, getAppTimezone(), "MM/yyyy");
}
