import "server-only";

import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import {
  getAppTimezone,
  getTodayDateKey,
  getWeekRangeFromDateKey,
} from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  DttClassModel,
  DttClassTaskModel,
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

export type LeaderboardPeriod = "week" | "month" | "year";
export type PeriodRange = { start: Date; end: Date }; // [start, end)

export function normalizeLeaderboardPeriod(
  value?: string | string[] | null,
): LeaderboardPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "week" || candidate === "year" ? candidate : "month";
}

export function getCurrentPeriodKey(
  period: LeaderboardPeriod,
  now = new Date(),
): string {
  const tz = getAppTimezone();
  if (period === "week") {
    return getWeekRangeFromDateKey(getTodayDateKey(now), 6).startStr;
  }
  if (period === "year") return formatInTimeZone(now, tz, "yyyy");
  return formatInTimeZone(now, tz, "yyyy-MM");
}

export function resolvePeriodRange(
  period: LeaderboardPeriod,
  periodKey: string,
): PeriodRange {
  const tz = getAppTimezone();
  if (period === "week") {
    const { startStr } = getWeekRangeFromDateKey(periodKey, 6);
    const start = fromZonedTime(`${startStr}T00:00:00`, tz);
    return { start, end: addDays(start, 7) };
  }
  if (period === "year") {
    return {
      start: fromZonedTime(`${periodKey}-01-01T00:00:00`, tz),
      end: fromZonedTime(`${Number(periodKey) + 1}-01-01T00:00:00`, tz),
    };
  }
  const year = Number(periodKey.slice(0, 4));
  const month = Number(periodKey.slice(5, 7));
  const nextYearMonth = month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, "0")}`;
  return {
    start: fromZonedTime(`${periodKey}-01T00:00:00`, tz),
    end: fromZonedTime(`${nextYearMonth}-01T00:00:00`, tz),
  };
}

export function listSelectablePeriods(
  period: LeaderboardPeriod,
  now = new Date(),
): string[] {
  const tz = getAppTimezone();
  const year = Number(formatInTimeZone(now, tz, "yyyy"));
  if (period === "year") return [String(year)];
  if (period === "month") {
    const currentMonth = Number(formatInTimeZone(now, tz, "MM"));
    return Array.from(
      { length: currentMonth },
      (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
    );
  }
  const keys: string[] = [];
  const previousWeekStartKey = (weekStartKey: string): string => {
    const prevDay = formatInTimeZone(
      addDays(fromZonedTime(`${weekStartKey}T12:00:00`, tz), -1),
      tz,
      "yyyy-MM-dd",
    );
    return getWeekRangeFromDateKey(prevDay, 6).startStr;
  };
  let cursor = getWeekRangeFromDateKey(getTodayDateKey(now), 6).startStr;
  while (cursor.startsWith(String(year))) {
    keys.push(cursor);
    cursor = previousWeekStartKey(cursor);
  }
  return keys;
}

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

function buildPeriodPointsPipeline(range: PeriodRange) {
  return [
    {
      $match: {
        source: {
          $in: [
            "task_reward",
            "task_streak_bonus_reward",
            "customer_interaction_reward",
            "new_customer_reward",
          ],
        },
        createdAt: { $gte: range.start, $lt: range.end },
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

async function getTopUsersByPeriodPoints(
  filter: Record<string, unknown>,
  limit: number,
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
  teamId: string | null = null,
): Promise<LeaderboardEntry[]> {
  await connectToDatabase();
  const range = resolvePeriodRange(period, periodKey);

  const topIds = (await PointTransactionModel.aggregate([
    ...buildPeriodPointsPipeline(range),
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
      $match: {
        ...Object.fromEntries(
          Object.entries(filter).map(([k, v]) => [`user.${k}`, v]),
        ),
        ...(teamId ? { "user.teamId": toObjectId(teamId) } : {}),
      },
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

export async function getTopMembers(
  limit = 5,
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
  teamId: string | null = null,
): Promise<LeaderboardEntry[]> {
  return getTopUsersByPeriodPoints(
    { role: "MEMBER", status: "ACTIVE" },
    limit,
    period,
    periodKey,
    teamId,
  );
}

export async function getTopNgv(
  limit = 5,
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
  teamId: string | null = null,
): Promise<LeaderboardEntry[]> {
  return getTopUsersByPeriodPoints(
    { role: "NGV", status: "ACTIVE" },
    limit,
    period,
    periodKey,
    teamId,
  );
}

export async function getTopTdm(
  limit = 5,
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
  teamId: string | null = null,
): Promise<LeaderboardEntry[]> {
  return getTopUsersByPeriodPoints(
    { role: "TDM", status: "ACTIVE" },
    limit,
    period,
    periodKey,
    teamId,
  );
}

export async function getTopRegionalLeads(
  limit = 3,
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
  teamId: string | null = null,
): Promise<LeaderboardEntry[]> {
  return getTopUsersByPeriodPoints(
    { role: "REGIONAL_LEAD", status: "ACTIVE" },
    limit,
    period,
    periodKey,
    teamId,
  );
}

export async function getTopZoneLeads(
  limit = 3,
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
  teamId: string | null = null,
): Promise<LeaderboardEntry[]> {
  return getTopUsersByPeriodPoints(
    { role: "ZONE_LEAD", status: "ACTIVE" },
    limit,
    period,
    periodKey,
    teamId,
  );
}

export async function getTopTeamLeads(
  limit = 5,
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
  teamId: string | null = null,
): Promise<LeaderboardEntry[]> {
  return getTopUsersByPeriodPoints(
    { role: "TEAM_LEAD", status: "ACTIVE" },
    limit,
    period,
    periodKey,
    teamId,
  );
}

export async function getTopRegions(
  limit = 3,
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
  teamId: string | null = null,
): Promise<RegionLeaderboardEntry[]> {
  await connectToDatabase();
  const range = resolvePeriodRange(period, periodKey);

  const aggregated = (await PointTransactionModel.aggregate([
    ...buildPeriodPointsPipeline(range),
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
      $match: {
        "user.regionId": { $ne: null },
        "user.status": "ACTIVE",
        ...(teamId ? { "user.teamId": toObjectId(teamId) } : {}),
      },
    },
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
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
  teamId: string | null = null,
): Promise<ZoneLeaderboardEntry[]> {
  await connectToDatabase();
  const range = resolvePeriodRange(period, periodKey);

  const aggregated = (await PointTransactionModel.aggregate([
    ...buildPeriodPointsPipeline(range),
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
      $match: {
        "user.zoneId": { $ne: null },
        "user.status": "ACTIVE",
        ...(teamId ? { "user.teamId": toObjectId(teamId) } : {}),
      },
    },
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

export function getLeaderboardPeriodLabel(
  period: LeaderboardPeriod,
  periodKey: string,
): string {
  if (period === "year") return `Năm ${periodKey}`;
  if (period === "month") {
    const [year, month] = periodKey.split("-");
    return `Tháng ${month}/${year}`;
  }
  const { startStr, endStr } = getWeekRangeFromDateKey(periodKey, 6);
  return `Tuần ${startStr.slice(8, 10)}/${startStr.slice(5, 7)} – ${endStr.slice(8, 10)}/${endStr.slice(5, 7)}`;
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

  const classTaskAssignments = await DttClassTaskModel.find({
    classId: toObjectId(classId),
  }).lean();

  const dttTaskIds = classTaskAssignments.map((a) => a.taskId);
  const dttTasks = await TaskModel.find({
    _id: { $in: dttTaskIds },
    isActive: true,
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

export type PersonalLeaderboardResult = {
  type: "user" | "region" | "zone";
  rank: number;
  totalXp: number;
  userEntry?: LeaderboardEntry;
  regionEntry?: RegionLeaderboardEntry;
  zoneEntry?: ZoneLeaderboardEntry;
};

async function getRoleLeaderboardRankAndScore(
  user: UserRecord,
  role: string,
  period: LeaderboardPeriod,
  periodKey: string,
): Promise<{ rank: number; totalXp: number; entry: LeaderboardEntry } | null> {
  const userId = user._id.toString();
  await connectToDatabase();
  const range = resolvePeriodRange(period, periodKey);

  const aggregated = (await PointTransactionModel.aggregate([
    ...buildPeriodPointsPipeline(range),
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
      $match: {
        "user.role": role,
        "user.status": "ACTIVE",
        ...(user.teamId
          ? { "user.teamId": toObjectId(user.teamId.toString()) }
          : {}),
      },
    },
    { $sort: { monthlyXp: -1 } },
  ])) as { _id: unknown; monthlyXp: number }[];

  const userIndex = aggregated.findIndex(
    (row) => (row._id as { toString(): string }).toString() === userId,
  );

  let rank: number;
  let totalXp: number;

  if (userIndex !== -1) {
    rank = userIndex + 1;
    totalXp = aggregated[userIndex].monthlyXp;
  } else {
    rank = aggregated.length + 1;
    totalXp = 0;
  }

  const entry = toLeaderboardEntry(user, totalXp, rank);
  const equippedMap = await getEquippedPayloadsForUsers([userId]);
  const eq = equippedMap.get(userId);
  if (eq) {
    entry.equipped = serializeEquipped(eq);
  }

  return { rank, totalXp, entry };
}

export async function getUserLeaderboardResult(
  userId: string,
  activeBoard: string,
  period: LeaderboardPeriod = "month",
  periodKey: string = getCurrentPeriodKey(period),
): Promise<PersonalLeaderboardResult | null> {
  await connectToDatabase();
  const user = (await UserModel.findById(userId).lean()) as UserRecord | null;
  if (!user) return null;

  if (activeBoard === "regions") {
    if (!user.regionId) return null;
    const allRegions = await getTopRegions(
      999,
      period,
      periodKey,
      user.teamId?.toString() ?? null,
    );
    const userRegion = allRegions.find((r) => r.id === user.regionId?.toString());
    if (!userRegion) {
      const region = await RegionModel.findById(user.regionId)
        .select({ code: 1, name: 1 })
        .lean();
      if (!region) return null;
      return {
        type: "region",
        rank: allRegions.length + 1,
        totalXp: 0,
        regionEntry: {
          id: (region._id as { toString(): string }).toString(),
          name: region.name,
          code: region.code,
          rank: allRegions.length + 1,
          totalXp: 0,
          memberCount: 0,
        },
      };
    }
    return {
      type: "region",
      rank: userRegion.rank,
      totalXp: userRegion.totalXp,
      regionEntry: userRegion,
    };
  }

  if (activeBoard === "zones") {
    if (!user.zoneId) return null;
    const allZones = await getTopZones(
      999,
      period,
      periodKey,
      user.teamId?.toString() ?? null,
    );
    const userZone = allZones.find((z) => z.id === user.zoneId?.toString());
    if (!userZone) {
      const zone = await ZoneModel.findById(user.zoneId)
        .select({ code: 1, name: 1 })
        .lean();
      if (!zone) return null;
      return {
        type: "zone",
        rank: allZones.length + 1,
        totalXp: 0,
        zoneEntry: {
          id: (zone._id as { toString(): string }).toString(),
          name: zone.name,
          code: zone.code,
          rank: allZones.length + 1,
          totalXp: 0,
          memberCount: 0,
        },
      };
    }
    return {
      type: "zone",
      rank: userZone.rank,
      totalXp: userZone.totalXp,
      zoneEntry: userZone,
    };
  }

  // Individual boards (tdm, members, ngv, zone-leads, leads, team-leads)
  const userRole = user.role;
  // Supported roles for leaderboard
  if (
    !["TDM", "MEMBER", "NGV", "ZONE_LEAD", "REGIONAL_LEAD", "TEAM_LEAD"].includes(
      userRole,
    )
  ) {
    return null;
  }

  const res = await getRoleLeaderboardRankAndScore(user, userRole, period, periodKey);
  if (!res) return null;

  return {
    type: "user",
    rank: res.rank,
    totalXp: res.totalXp,
    userEntry: res.entry,
  };
}

