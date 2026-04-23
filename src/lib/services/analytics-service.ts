import "server-only";

import { formatInTimeZone } from "date-fns-tz";
import type { PipelineStage, Types } from "mongoose";

import { getTodayDateKey } from "@/lib/dates";
import type { SessionUser } from "@/lib/domain";
import {
  SubmissionModel,
  TaskModel,
  type TaskRecord,
  UserModel,
} from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import { appliesToUser } from "@/lib/tasks/policy";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import { sortTasksForDisplay, taskToScope } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";

export type TrendPoint = {
  date: string;
  completed: number;
};

export type TaskActivityCell = {
  completionCount: number;
  date: string;
  scheduled: boolean;
};

export type TaskActivityRow = {
  cells: TaskActivityCell[];
  completedDays: number;
  currentStreak: number;
  description: string;
  id: string;
  title: string;
  todayCompletionCount: number;
  totalCompletions: number;
};

export type UserTaskActivityStats = {
  completedDays: number;
  currentStreak: number;
  days: number;
  endDate: string;
  rows: TaskActivityRow[];
  startDate: string;
  totalCompletions: number;
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

function userOrgClauses(user: SessionUser) {
  const clauses: Record<string, unknown>[] = [];
  if (user.teamId) clauses.push({ teamId: toObjectId(user.teamId) });
  if (user.zoneId) clauses.push({ zoneId: toObjectId(user.zoneId) });
  if (user.regionId) clauses.push({ regionId: toObjectId(user.regionId) });
  return clauses;
}

function userScopeShape(user: SessionUser) {
  return {
    teamId: user.teamId ?? null,
    zoneId: user.zoneId ?? null,
    regionId: user.regionId ?? null,
    role: user.role,
  };
}

function countCurrentStreak(
  cells: Pick<TaskActivityCell, "completionCount" | "scheduled">[],
) {
  let streak = 0;
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index];
    if (!cell.scheduled) continue;
    if (cell.completionCount <= 0) break;
    streak += 1;
  }
  return streak;
}

function countDailyStreak(dates: string[], completionByDate: Map<string, number>) {
  let streak = 0;
  for (let index = dates.length - 1; index >= 0; index -= 1) {
    if ((completionByDate.get(dates[index]) ?? 0) <= 0) break;
    streak += 1;
  }
  return streak;
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

export async function getUserTaskActivityStats(
  user: SessionUser,
  days = 30,
): Promise<UserTaskActivityStats> {
  await connectToDatabase();

  const safeDays = Math.min(Math.max(days, 1), 90);
  const todayKey = getTodayDateKey();
  const startKey = shiftDateKey(todayKey, -(safeDays - 1));
  const dates = enumerateDates(startKey, todayKey);
  const orgClauses = userOrgClauses(user);

  if (orgClauses.length === 0) {
    return {
      completedDays: 0,
      currentStreak: 0,
      days: safeDays,
      endDate: todayKey,
      rows: [],
      startDate: startKey,
      totalCompletions: 0,
    };
  }

  const tasks = (await TaskModel.find({
    isActive: true,
    $or: orgClauses,
  }).lean()) as TaskRecord[];

  const applicableTasks = sortTasksForDisplay(
    tasks.filter((task) =>
      appliesToUser(taskToScope(task), userScopeShape(user)),
    ),
  );

  if (applicableTasks.length === 0) {
    return {
      completedDays: 0,
      currentStreak: 0,
      days: safeDays,
      endDate: todayKey,
      rows: [],
      startDate: startKey,
      totalCompletions: 0,
    };
  }

  const submissions = await SubmissionModel.find({
    date: { $gte: startKey, $lte: todayKey },
    subjectUserId: toObjectId(user.id),
    taskId: { $in: applicableTasks.map((task) => task._id) },
  }).lean<Array<{ completionCount?: number; date: string; taskId: Types.ObjectId }>>();

  const completionByTaskDate = new Map<string, number>();
  const completionByDate = new Map<string, number>();

  for (const submission of submissions) {
    const taskId = submission.taskId.toString();
    const amount = submission.completionCount ?? 1;
    const key = `${taskId}:${submission.date}`;
    completionByTaskDate.set(key, (completionByTaskDate.get(key) ?? 0) + amount);
    completionByDate.set(
      submission.date,
      (completionByDate.get(submission.date) ?? 0) + amount,
    );
  }

  const rows = applicableTasks.map((task) => {
    const taskId = task._id.toString();
    const cells = dates.map((date) => ({
      completionCount: completionByTaskDate.get(`${taskId}:${date}`) ?? 0,
      date,
      scheduled: isTaskScheduledForDate(task, date),
    }));
    const totalCompletions = cells.reduce(
      (total, cell) => total + cell.completionCount,
      0,
    );
    const completedDays = cells.filter((cell) => cell.completionCount > 0).length;

    return {
      cells,
      completedDays,
      currentStreak: countCurrentStreak(cells),
      description: task.description,
      id: taskId,
      title: task.title,
      todayCompletionCount: cells[cells.length - 1]?.completionCount ?? 0,
      totalCompletions,
    };
  });

  return {
    completedDays: Array.from(completionByDate.values()).filter((count) => count > 0)
      .length,
    currentStreak: countDailyStreak(dates, completionByDate),
    days: safeDays,
    endDate: todayKey,
    rows,
    startDate: startKey,
    totalCompletions: Array.from(completionByDate.values()).reduce(
      (total, count) => total + count,
      0,
    ),
  };
}
