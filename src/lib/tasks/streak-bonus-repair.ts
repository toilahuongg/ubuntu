import mongoose, { Types } from "mongoose";

import {
  PointTransactionModel,
  SubmissionModel,
  TaskModel,
  UserModel,
  XpTransactionModel,
} from "@/lib/models";
import type { TaskType } from "@/lib/tasks/constants";
import type { TaskScheduleType } from "@/lib/tasks/schedule";
import { isMongoTransactionalWriteUnsupportedError } from "@/lib/tasks/weekly-limit-repair";
import {
  buildTaskStreakBonusDescription,
  buildTaskStreakBonusLegacyDescription,
  calculateTaskStreakBonus,
  getTaskStreakBonusPeriodRange,
  type TaskStreakMilestone,
} from "@/lib/tasks/streaks";

export type TaskStreakBonusRepairTask = {
  expReward: number;
  id: string;
  pointReward: number;
  scheduleType?: TaskScheduleType | null;
  scheduledMonthDays?: number[] | null;
  scheduledWeekdays?: number[] | null;
  title: string;
  taskType: TaskType;
};

export type TaskStreakBonusRepairSubmission = {
  date: string;
  taskId: string;
  userId: string;
};

export type TaskStreakBonusRepairExistingBonus = {
  createdAt: Date;
  description: string;
  taskId: string;
  userId: string;
};

export type TaskStreakBonusRepairRow = {
  bonusExp: number;
  bonusPoints: number;
  date: string;
  description: string;
  milestone: TaskStreakMilestone;
  periodKey: string;
  taskId: string;
  taskTitle: string;
  userId: string;
};

export type TaskStreakBonusRepairReport = {
  rows: TaskStreakBonusRepairRow[];
  totals: {
    bonusesMissing: number;
    pointsToAward: number;
    submissionsScanned: number;
    tasksScanned: number;
    usersAffected: number;
    xpToAward: number;
  };
};

function groupKey(...parts: string[]) {
  return parts.join(":");
}

function isWithinRange(date: Date, range: { end: Date; start: Date }) {
  return date >= range.start && date < range.end;
}

function hasExistingBonus(
  existingBonuses: readonly TaskStreakBonusRepairExistingBonus[],
  input: {
    description: string;
    legacyDescription: string;
    periodRange: { end: Date; start: Date };
    plannedDescriptions: ReadonlySet<string>;
    taskId: string;
    userId: string;
  },
) {
  const plannedKey = groupKey(input.userId, input.taskId, input.description);
  if (input.plannedDescriptions.has(plannedKey)) return true;

  return existingBonuses.some((bonus) => {
    if (bonus.userId !== input.userId || bonus.taskId !== input.taskId) {
      return false;
    }
    if (bonus.description === input.description) return true;
    return (
      bonus.description === input.legacyDescription &&
      isWithinRange(bonus.createdAt, input.periodRange)
    );
  });
}

export function buildMissingTaskStreakBonusRepairs(input: {
  existingPointBonuses: readonly TaskStreakBonusRepairExistingBonus[];
  existingXpBonuses: readonly TaskStreakBonusRepairExistingBonus[];
  submissions: readonly TaskStreakBonusRepairSubmission[];
  tasks: readonly TaskStreakBonusRepairTask[];
}): TaskStreakBonusRepairRow[] {
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));
  const datesByUserTaskMonth = new Map<string, string[]>();

  for (const submission of input.submissions) {
    const task = taskById.get(submission.taskId);
    if (!task || task.taskType !== "DAILY_PER_MEMBER") continue;

    const periodKey = submission.date.slice(0, 7);
    const key = groupKey(submission.userId, submission.taskId, periodKey);
    const dates = datesByUserTaskMonth.get(key) ?? [];
    dates.push(submission.date);
    datesByUserTaskMonth.set(key, dates);
  }

  const rows: TaskStreakBonusRepairRow[] = [];
  const plannedXpDescriptions = new Set<string>();
  const plannedPointDescriptions = new Set<string>();

  for (const [key, dates] of datesByUserTaskMonth) {
    const [userId, taskId, periodKey] = key.split(":");
    const task = taskById.get(taskId);
    if (!task) continue;

    for (const date of Array.from(new Set(dates)).sort()) {
      const streakBonus = calculateTaskStreakBonus({
        completedDateKeys: dates,
        dateKey: date,
        expReward: task.expReward,
        pointReward: task.pointReward,
        task,
      });
      if (!streakBonus.awarded || !streakBonus.milestone) continue;

      const description = buildTaskStreakBonusDescription({
        milestone: streakBonus.milestone,
        periodKey,
        taskTitle: task.title,
      });
      const legacyDescription = buildTaskStreakBonusLegacyDescription({
        milestone: streakBonus.milestone,
        taskTitle: task.title,
      });
      const periodRange = getTaskStreakBonusPeriodRange(periodKey);
      const hasXp =
        streakBonus.bonusExp <= 0 ||
        hasExistingBonus(input.existingXpBonuses, {
          description,
          legacyDescription,
          periodRange,
          plannedDescriptions: plannedXpDescriptions,
          taskId,
          userId,
        });
      const hasPoints =
        streakBonus.bonusPoints <= 0 ||
        hasExistingBonus(input.existingPointBonuses, {
          description,
          legacyDescription,
          periodRange,
          plannedDescriptions: plannedPointDescriptions,
          taskId,
          userId,
        });

      if (hasXp && hasPoints) continue;

      if (!hasXp) plannedXpDescriptions.add(groupKey(userId, taskId, description));
      if (!hasPoints) {
        plannedPointDescriptions.add(groupKey(userId, taskId, description));
      }

      rows.push({
        bonusExp: hasXp ? 0 : streakBonus.bonusExp,
        bonusPoints: hasPoints ? 0 : streakBonus.bonusPoints,
        date,
        description,
        milestone: streakBonus.milestone,
        periodKey,
        taskId,
        taskTitle: task.title,
        userId,
      });
    }
  }

  return rows;
}

export function buildTaskStreakBonusRepairReport(input: {
  rows: TaskStreakBonusRepairRow[];
  submissionsScanned: number;
  tasksScanned: number;
}): TaskStreakBonusRepairReport {
  return {
    rows: input.rows,
    totals: {
      bonusesMissing: input.rows.length,
      pointsToAward: input.rows.reduce((sum, row) => sum + row.bonusPoints, 0),
      submissionsScanned: input.submissionsScanned,
      tasksScanned: input.tasksScanned,
      usersAffected: new Set(input.rows.map((row) => row.userId)).size,
      xpToAward: input.rows.reduce((sum, row) => sum + row.bonusExp, 0),
    },
  };
}

export async function repairMissingTaskStreakBonuses({
  apply = false,
  fromDate,
  toDate,
}: {
  apply?: boolean;
  fromDate: string;
  toDate?: string;
}): Promise<TaskStreakBonusRepairReport> {
  const dateFilter: { $gte: string; $lte?: string } = { $gte: fromDate };
  if (toDate) dateFilter.$lte = toDate;

  const submissions = await SubmissionModel.find({
    completionCount: { $gt: 0 },
    date: dateFilter,
  })
    .select({ date: 1, subjectUserId: 1, taskId: 1 })
    .lean();

  const taskIds = Array.from(
    new Set(submissions.map((submission) => submission.taskId.toString())),
  );
  const userIds = Array.from(
    new Set(submissions.map((submission) => submission.subjectUserId.toString())),
  );

  const tasks = await TaskModel.find({
    _id: { $in: taskIds.map((taskId) => new Types.ObjectId(taskId)) },
    taskType: "DAILY_PER_MEMBER",
  })
    .select({
      expReward: 1,
      pointReward: 1,
      scheduleType: 1,
      scheduledMonthDays: 1,
      scheduledWeekdays: 1,
      taskType: 1,
      title: 1,
    })
    .lean();

  const dailyTaskIds = tasks.map((task) => task._id);
  const [existingXpBonuses, existingPointBonuses] = await Promise.all([
    XpTransactionModel.find({
      source: "task_streak_bonus",
      sourceId: { $in: dailyTaskIds },
      userId: { $in: userIds.map((userId) => new Types.ObjectId(userId)) },
    })
      .select({ createdAt: 1, description: 1, sourceId: 1, userId: 1 })
      .lean(),
    PointTransactionModel.find({
      source: "task_streak_bonus_reward",
      sourceId: { $in: dailyTaskIds },
      userId: { $in: userIds.map((userId) => new Types.ObjectId(userId)) },
    })
      .select({ createdAt: 1, description: 1, sourceId: 1, userId: 1 })
      .lean(),
  ]);

  const rows = buildMissingTaskStreakBonusRepairs({
    existingPointBonuses: existingPointBonuses.map((bonus) => ({
      createdAt: bonus.createdAt,
      description: bonus.description,
      taskId: bonus.sourceId?.toString() ?? "",
      userId: bonus.userId.toString(),
    })),
    existingXpBonuses: existingXpBonuses.map((bonus) => ({
      createdAt: bonus.createdAt,
      description: bonus.description,
      taskId: bonus.sourceId?.toString() ?? "",
      userId: bonus.userId.toString(),
    })),
    submissions: submissions.map((submission) => ({
      date: submission.date,
      taskId: submission.taskId.toString(),
      userId: submission.subjectUserId.toString(),
    })),
    tasks: tasks.map((task) => ({
      expReward: task.expReward ?? 0,
      id: task._id.toString(),
      pointReward: task.pointReward ?? 0,
      scheduleType: task.scheduleType,
      scheduledMonthDays: task.scheduledMonthDays,
      scheduledWeekdays: task.scheduledWeekdays,
      title: task.title,
      taskType: task.taskType,
    })),
  });

  if (apply && rows.length > 0) {
    await applyTaskStreakBonusRepairRows(rows);
  }

  return buildTaskStreakBonusRepairReport({
    rows,
    submissionsScanned: submissions.length,
    tasksScanned: tasks.length,
  });
}

async function applyTaskStreakBonusRepairRows(
  rows: readonly TaskStreakBonusRepairRow[],
) {
  const execute = async (session: mongoose.ClientSession | null) => {
    const xpRows = rows.filter((row) => row.bonusExp > 0);
    const pointRows = rows.filter((row) => row.bonusPoints > 0);

    if (xpRows.length > 0) {
      await XpTransactionModel.create(
        xpRows.map((row) => ({
          amount: row.bonusExp,
          description: row.description,
          source: "task_streak_bonus",
          sourceId: new Types.ObjectId(row.taskId),
          userId: new Types.ObjectId(row.userId),
        })),
        session ? { session } : undefined,
      );
    }

    if (pointRows.length > 0) {
      await PointTransactionModel.create(
        pointRows.map((row) => ({
          amount: row.bonusPoints,
          description: row.description,
          source: "task_streak_bonus_reward",
          sourceId: new Types.ObjectId(row.taskId),
          userId: new Types.ObjectId(row.userId),
        })),
        session ? { session } : undefined,
      );
    }

    for (const row of rows) {
      await UserModel.updateOne(
        { _id: new Types.ObjectId(row.userId) },
        {
          $inc: {
            pointBalance: row.bonusPoints,
            totalXp: row.bonusExp,
          },
        },
        session ? { session } : undefined,
      );
    }
  };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => execute(session));
  } catch (error) {
    if (!isMongoTransactionalWriteUnsupportedError(error)) {
      throw error;
    }
    await execute(null);
  } finally {
    await session.endSession();
  }
}
