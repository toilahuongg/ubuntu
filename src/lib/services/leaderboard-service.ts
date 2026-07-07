import "server-only";

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import {
  getAppTimezone,
  getCurrentYearMonth,
  getTodayDateKey,
  getWeekRangeFromDateKey,
} from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  DttClassModel,
  DttEnrollmentModel,
  PointTransactionModel,
  RegionModel,
  SubmissionModel,
  TaskModel,
  UserModel,
  ZoneModel,
  type UserRecord,
} from "@/lib/models";
import { toObjectId } from "@/lib/utils/ids";
import { getLevelInfo } from "@/lib/level-utils";
import type { LeaderboardEntry } from "@/lib/services/gamification-service";
import { getEquippedPayloadsForUsers } from "@/lib/services/cosmetics-service";
import { serializeEquipped } from "@/lib/cosmetics/serialize";

export type RegionLeaderboardEntry = {
  id: string;
  name: string;
  code: string;
  rank: number;
  totalXp: number;
  memberCount: number;
};

export type ZoneLeaderboardEntry = RegionLeaderboardEntry;

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

function buildMonthlyPointsPipeline(yearMonth: string) {
  const timezone = getAppTimezone();
  const startOfMonth = fromZonedTime(`${yearMonth}-01T00:00:00`, timezone);
  const year = Number(yearMonth.slice(0, 4));
  const month = Number(yearMonth.slice(5, 7));
  const nextYearMonth = month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, "0")}`;
  const endOfMonth = fromZonedTime(`${nextYearMonth}-01T00:00:00`, timezone);

  return [
    {
      $match: {
        source: { $in: ["task_reward", "task_streak_bonus_reward"] },
        createdAt: { $gte: startOfMonth, $lt: endOfMonth },
      },
    },
    {
      $group: {
        _id: "$userId",
        monthlyXp: {
          $sum: "$amount",
        },
      },
    },
    { $match: { monthlyXp: { $gt: 0 } } },
  ];
}

async function getTopUsersByMonthlyXp(
  filter: Record<string, unknown>,
  limit: number,
): Promise<LeaderboardEntry[]> {
  await connectToDatabase();
  const yearMonth = getCurrentYearMonth();

  const topIds = (await PointTransactionModel.aggregate([
    ...buildMonthlyPointsPipeline(yearMonth),
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

  const entries = topIds.map((row, index) =>
    toLeaderboardEntry(row.user, row.monthlyXp, index + 1),
  );

  const equippedMap = await getEquippedPayloadsForUsers(
    entries.map((e) => e.id),
  );
  return entries.map((e) => {
    const eq = equippedMap.get(e.id);
    return eq ? { ...e, equipped: serializeEquipped(eq) } : e;
  });
}

export async function getTopMembers(limit = 5): Promise<LeaderboardEntry[]> {
  return getTopUsersByMonthlyXp({ role: "MEMBER", status: "ACTIVE" }, limit);
}

export async function getTopNgv(limit = 5): Promise<LeaderboardEntry[]> {
  return getTopUsersByMonthlyXp({ role: "NGV", status: "ACTIVE" }, limit);
}

export async function getTopTdm(limit = 5): Promise<LeaderboardEntry[]> {
  return getTopUsersByMonthlyXp({ role: "TDM", status: "ACTIVE" }, limit);
}

export async function getTopRegionalLeads(
  limit = 3,
): Promise<LeaderboardEntry[]> {
  return getTopUsersByMonthlyXp(
    { role: "REGIONAL_LEAD", status: "ACTIVE" },
    limit,
  );
}

export async function getTopZoneLeads(limit = 3): Promise<LeaderboardEntry[]> {
  return getTopUsersByMonthlyXp(
    { role: "ZONE_LEAD", status: "ACTIVE" },
    limit,
  );
}

export async function getTopRegions(
  limit = 3,
): Promise<RegionLeaderboardEntry[]> {
  await connectToDatabase();
  const yearMonth = getCurrentYearMonth();

  const aggregated = (await PointTransactionModel.aggregate([
    ...buildMonthlyPointsPipeline(yearMonth),
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
    { $match: { totalXp: { $gt: 0 } } },
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

export async function getTopZones(
  limit = 3,
): Promise<ZoneLeaderboardEntry[]> {
  await connectToDatabase();
  const yearMonth = getCurrentYearMonth();

  const aggregated = (await PointTransactionModel.aggregate([
    ...buildMonthlyPointsPipeline(yearMonth),
    {
      $lookup: {
        as: "user",
        foreignField: "_id",
        from: "users",
        localField: "_id",
      },
    },
    { $unwind: "$user" },
    { $match: { "user.zoneId": { $ne: null }, "user.status": "ACTIVE" } },
    {
      $group: {
        _id: "$user.zoneId",
        memberCount: { $sum: 1 },
        totalXp: { $sum: "$monthlyXp" },
      },
    },
    { $match: { totalXp: { $gt: 0 } } },
    { $sort: { totalXp: -1 } },
    { $limit: limit },
  ])) as { _id: unknown; totalXp: number; memberCount: number }[];

  if (aggregated.length === 0) return [];

  const zoneIds = aggregated.map((row) => row._id);
  const zones = (await ZoneModel.find({ _id: { $in: zoneIds } })
    .select({ code: 1, name: 1 })
    .lean()) as { _id: { toString(): string }; code: string; name: string }[];

  const zoneMap = new Map(
    zones.map((zone) => [
      zone._id.toString(),
      { code: zone.code, name: zone.name },
    ]),
  );

  return aggregated
    .map((row, index) => {
      const id = (row._id as { toString(): string }).toString();
      const meta = zoneMap.get(id);
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
    .filter((zone): zone is ZoneLeaderboardEntry => zone !== null);
}

export function getLeaderboardMonthLabel(now = new Date()): string {
  return formatInTimeZone(now, getAppTimezone(), "MM/yyyy");
}

export async function getDttClassLeaderboard(
  classId: string,
  taskId?: string,
): Promise<{
  classInfo: { name: string; startDayOfWeek: number; startStr: string; endStr: string };
  entries: LeaderboardEntry[];
  tasks: { id: string; title: string }[];
}> {
  await connectToDatabase();

  const classDoc = await DttClassModel.findById(classId).lean();
  if (!classDoc) throw new Error("Không tìm thấy lớp học.");

  const startDayOfWeek = classDoc.startDayOfWeek ?? 1;
  const { startStr, endStr } = getWeekRangeFromDateKey(getTodayDateKey(), startDayOfWeek);

  const dttTasks = await TaskModel.find({
    teamId: classDoc.teamId,
    isActive: true,
    isDtt: true,
  }).select({ title: 1 }).lean();

  const enrollments = await DttEnrollmentModel.find({ classId }).lean();
  const studentUserIds = enrollments.map((e) => e.userId);

  if (studentUserIds.length === 0) {
    return {
      classInfo: { name: classDoc.name, startDayOfWeek, startStr, endStr },
      entries: [],
      tasks: dttTasks.map((t) => ({ id: t._id.toString(), title: t.title })),
    };
  }

  const matchQuery: Record<string, unknown> = {
    subjectUserId: { $in: studentUserIds },
    date: { $gte: startStr, $lte: endStr },
  };

  let aggregated: { _id: string; totalXp: number }[] = [];

  if (!taskId || taskId === "weekly-total") {
    const activeDttTaskIds = dttTasks.map((t) => t._id);
    matchQuery.taskId = { $in: activeDttTaskIds };

    const results = await SubmissionModel.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          as: "task",
          foreignField: "_id",
          from: "tasks",
          localField: "taskId",
        },
      },
      { $unwind: "$task" },
      {
        $group: {
          _id: "$subjectUserId",
          totalXp: {
            $sum: {
              $multiply: [
                { $ifNull: ["$task.pointReward", 0] },
                { $ifNull: ["$completionCount", 1] },
              ],
            },
          },
        },
      },
      { $match: { totalXp: { $gt: 0 } } },
      { $sort: { totalXp: -1 } },
    ]);
    aggregated = results.map((r) => ({ _id: r._id.toString(), totalXp: r.totalXp }));
  } else {
    matchQuery.taskId = toObjectId(taskId);

    const results = await SubmissionModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$subjectUserId",
          totalXp: { $sum: { $ifNull: ["$completionCount", 1] } },
        },
      },
      { $match: { totalXp: { $gt: 0 } } },
      { $sort: { totalXp: -1 } },
    ]);
    aggregated = results.map((r) => ({ _id: r._id.toString(), totalXp: r.totalXp }));
  }

  const users = await UserModel.find({ _id: { $in: studentUserIds } }).lean();
  const aggregatedMap = new Map(aggregated.map((r) => [r._id, r.totalXp]));

  const studentsWithScores = users.map((u) => {
    const totalXp = aggregatedMap.get(u._id.toString()) ?? 0;
    return { user: u, totalXp };
  });

  studentsWithScores.sort((a, b) => b.totalXp - a.totalXp);

  const formattedEntries = studentsWithScores.map((row, index) =>
    toLeaderboardEntry(row.user as UserRecord, row.totalXp, index + 1)
  );

  const equippedMap = await getEquippedPayloadsForUsers(
    formattedEntries.map((e) => e.id),
  );
  const finalEntries = formattedEntries.map((e) => {
    const eq = equippedMap.get(e.id);
    return eq ? { ...e, equipped: serializeEquipped(eq) } : e;
  });

  return {
    classInfo: { name: classDoc.name, startDayOfWeek, startStr, endStr },
    entries: finalEntries,
    tasks: dttTasks.map((t) => ({ id: t._id.toString(), title: t.title })),
  };
}

