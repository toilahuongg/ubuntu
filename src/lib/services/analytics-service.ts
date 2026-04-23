import "server-only";

import { formatInTimeZone } from "date-fns-tz";
import type { PipelineStage, Types } from "mongoose";

import { getTodayDateKey } from "@/lib/dates";
import type { SessionUser, TaskScope } from "@/lib/domain";
import { SubmissionModel, UserModel } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import { toObjectId } from "@/lib/utils/ids";

export type TrendPoint = {
  date: string;
  completed: number;
};

export type TaskDistributionEntry = {
  taskId: string;
  title: string;
  completionCount: number;
};

export type AnalyticsScopeInfo = {
  description: string;
  kind: TaskScope;
  shortLabel: string;
  subjectCount: number;
  subjectLabel: string;
  title: string;
};

const ANALYTICS_SCOPE_COPY: Record<
  TaskScope,
  Omit<AnalyticsScopeInfo, "kind" | "subjectCount">
> = {
  REGION: {
    description: "Dữ liệu của khu vực bạn phụ trách.",
    shortLabel: "Khu vực",
    subjectLabel: "Người trong khu vực",
    title: "Analytics khu vực",
  },
  TEAM: {
    description: "Dữ liệu của toàn nhóm bạn phụ trách.",
    shortLabel: "Nhóm",
    subjectLabel: "Người trong nhóm",
    title: "Analytics nhóm",
  },
  ZONE: {
    description: "Dữ liệu của địa vực bạn phụ trách.",
    shortLabel: "Địa vực",
    subjectLabel: "Người trong địa vực",
    title: "Analytics địa vực",
  },
};

function shiftDateKey(dateKey: string, days: number) {
  const base = new Date(`${dateKey}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return formatInTimeZone(base, "UTC", "yyyy-MM-dd");
}

function enumerateDates(startKey: string, endKey: string) {
  const out: string[] = [];
  let cur = startKey;
  while (cur <= endKey) {
    out.push(cur);
    cur = shiftDateKey(cur, 1);
  }
  return out;
}

function resolveAnalyticsScopeKind(user: SessionUser): TaskScope | null {
  if (user.role === "TEAM_LEAD" && user.teamId) return "TEAM";
  if (user.role === "ZONE_LEAD" && user.zoneId) return "ZONE";
  if (user.role === "REGIONAL_LEAD" && user.regionId) return "REGION";
  return null;
}

async function resolveSubjectUserIds(
  user: SessionUser,
): Promise<Types.ObjectId[] | "self"> {
  if (user.role === "MEMBER" || user.role === "NGV") return "self";
  await connectToDatabase();

  const filter: Record<string, unknown> = { status: "ACTIVE" };
  if (user.role === "TEAM_LEAD" && user.teamId) {
    filter.teamId = toObjectId(user.teamId);
  } else if (user.role === "ZONE_LEAD" && user.zoneId) {
    filter.zoneId = toObjectId(user.zoneId);
  } else if (user.role === "REGIONAL_LEAD" && user.regionId) {
    filter.regionId = toObjectId(user.regionId);
  } else {
    return "self";
  }

  const users = await UserModel.find(filter, { _id: 1 }).lean<
    Array<{ _id: Types.ObjectId }>
  >();
  return users.map((u) => u._id);
}

type SubjectMode = "AUTO" | "SELF";

async function buildSubjectFilter(user: SessionUser, mode: SubjectMode = "AUTO") {
  if (mode === "SELF") {
    return { subjectUserId: toObjectId(user.id) };
  }

  const subjects = await resolveSubjectUserIds(user);
  if (subjects === "self") {
    return { subjectUserId: toObjectId(user.id) };
  }
  return { subjectUserId: { $in: subjects } };
}

export async function getAnalyticsScopeInfo(
  user: SessionUser,
): Promise<AnalyticsScopeInfo | null> {
  const kind = resolveAnalyticsScopeKind(user);
  if (!kind) return null;

  const subjects = await resolveSubjectUserIds(user);
  if (subjects === "self") return null;

  return {
    ...ANALYTICS_SCOPE_COPY[kind],
    kind,
    subjectCount: subjects.length,
  };
}

export async function getCompletionTrend(
  user: SessionUser,
  days = 14,
  mode: SubjectMode = "AUTO",
): Promise<TrendPoint[]> {
  await connectToDatabase();
  const todayKey = getTodayDateKey();
  const startKey = shiftDateKey(todayKey, -(days - 1));

  const subjectFilter = await buildSubjectFilter(user, mode);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        ...subjectFilter,
        date: { $gte: startKey, $lte: todayKey },
      },
    },
    {
      $group: {
        _id: "$date",
        completed: { $sum: { $ifNull: ["$completionCount", 1] } },
      },
    },
  ];

  const rows = await SubmissionModel.aggregate<{
    _id: string;
    completed: number;
  }>(pipeline);

  const map = new Map(rows.map((r) => [r._id, r.completed]));
  return enumerateDates(startKey, todayKey).map((date) => ({
    date,
    completed: map.get(date) ?? 0,
  }));
}

export async function getTaskDistribution(
  user: SessionUser,
  days = 30,
  limit = 10,
  mode: SubjectMode = "AUTO",
): Promise<TaskDistributionEntry[]> {
  await connectToDatabase();
  const todayKey = getTodayDateKey();
  const startKey = shiftDateKey(todayKey, -(days - 1));

  const subjectFilter = await buildSubjectFilter(user, mode);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        ...subjectFilter,
        date: { $gte: startKey, $lte: todayKey },
      },
    },
    {
      $group: {
        _id: "$taskId",
        completionCount: { $sum: { $ifNull: ["$completionCount", 1] } },
      },
    },
    { $sort: { completionCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        as: "task",
        foreignField: "_id",
        from: "tasks",
        localField: "_id",
      },
    },
    { $unwind: "$task" },
    {
      $project: {
        _id: 0,
        taskId: { $toString: "$_id" },
        title: "$task.title",
        completionCount: 1,
      },
    },
  ];

  return SubmissionModel.aggregate<TaskDistributionEntry>(pipeline);
}
