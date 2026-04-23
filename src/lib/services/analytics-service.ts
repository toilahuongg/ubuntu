import "server-only";

import { formatInTimeZone } from "date-fns-tz";
import type { PipelineStage, Types } from "mongoose";

import { getTodayDateKey } from "@/lib/dates";
import type { SessionUser } from "@/lib/domain";
import { SubmissionModel, UserModel } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import { toObjectId } from "@/lib/utils/ids";

export type TrendPoint = {
  date: string;
  completed: number;
};

type SubjectMode = "AUTO" | "SELF";

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
  return users.map((entry) => entry._id);
}

async function buildSubjectFilter(
  user: SessionUser,
  mode: SubjectMode = "AUTO",
) {
  if (mode === "SELF") {
    return { subjectUserId: toObjectId(user.id) };
  }

  const subjects = await resolveSubjectUserIds(user);
  if (subjects === "self") {
    return { subjectUserId: toObjectId(user.id) };
  }

  return { subjectUserId: { $in: subjects } };
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

  const rows = await SubmissionModel.aggregate<{
    _id: string;
    completed: number;
  }>([
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
  ] satisfies PipelineStage[]);

  const completionByDate = new Map(
    rows.map((entry) => [entry._id, entry.completed]),
  );

  return enumerateDates(startKey, todayKey).map((date) => ({
    date,
    completed: completionByDate.get(date) ?? 0,
  }));
}
