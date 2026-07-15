import mongoose, { Types } from "mongoose";

import { getWeekRangeFromDateKey } from "@/lib/dates";
import { SubmissionModel, TaskModel, UserModel } from "@/lib/models";

export type WeeklyLimitRepairTask = {
  id: string;
  title: string;
  maxPerWeek: number;
  expReward: number;
  pointReward: number;
};

export type WeeklyLimitRepairUser = {
  id: string;
  fullName: string;
  totalXp: number;
  pointBalance: number;
};

export type WeeklyLimitRepairSubmission = {
  id: string;
  taskId: string;
  subjectUserId: string;
  date: string;
  completionCount: number;
  submittedAt: Date;
  createdAt: Date;
};

export type WeeklyLimitRepairGroup = {
  taskId: string;
  taskTitle: string;
  userId: string;
  userFullName: string;
  weekStart: string;
  weekEnd: string;
  limit: number;
  completionCountBefore: number;
  completionCountKept: number;
  completionCountDeleted: number;
  submissionsBefore: number;
  submissionsDeleted: number;
  deletedSubmissionIds: string[];
  xpDeducted: number;
  pointsDeducted: number;
};

export type WeeklyLimitRepairUserDeduction = {
  userId: string;
  userFullName: string;
  totalXpBefore: number;
  totalXpAfter: number;
  pointBalanceBefore: number;
  pointBalanceAfter: number;
  xpDeducted: number;
  pointsDeducted: number;
};

export type WeeklyLimitRepairTotals = {
  groupsScanned: number;
  overflowGroups: number;
  submissionsDeleted: number;
  completionCountDeleted: number;
  xpDeducted: number;
  pointsDeducted: number;
};

export type WeeklyLimitRepairPlan = {
  requestedFromDate: string;
  effectiveFromDate: string;
  groups: WeeklyLimitRepairGroup[];
  userDeductions: WeeklyLimitRepairUserDeduction[];
  totals: WeeklyLimitRepairTotals;
};

type GroupAccumulator = {
  task: WeeklyLimitRepairTask;
  user: WeeklyLimitRepairUser;
  weekStart: string;
  weekEnd: string;
  submissions: WeeklyLimitRepairSubmission[];
};

export function resolveWeeklyLimitRepairDateRange(requestedFromDate: string) {
  return {
    requestedFromDate,
    effectiveFromDate: getWeekRangeFromDateKey(requestedFromDate, 7).startStr,
  };
}

export function planWeeklyLimitRepairs(input: {
  tasks: WeeklyLimitRepairTask[];
  users: WeeklyLimitRepairUser[];
  submissions: WeeklyLimitRepairSubmission[];
  fromDate: string;
}): WeeklyLimitRepairPlan {
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));
  const userById = new Map(input.users.map((user) => [user.id, user]));
  const groupsByKey = new Map<string, GroupAccumulator>();

  for (const submission of input.submissions) {
    if (submission.date < input.fromDate || submission.completionCount <= 0) {
      continue;
    }

    const task = taskById.get(submission.taskId);
    const user = userById.get(submission.subjectUserId);
    if (!task || !user) continue;

    const weekRange = getWeekRangeFromDateKey(submission.date, 7);
    const groupKey = [
      submission.taskId,
      submission.subjectUserId,
      weekRange.startStr,
    ].join(":");
    const group =
      groupsByKey.get(groupKey) ??
      {
        task,
        user,
        weekStart: weekRange.startStr,
        weekEnd: weekRange.endStr,
        submissions: [],
      };

    group.submissions.push(submission);
    groupsByKey.set(groupKey, group);
  }

  const groups: WeeklyLimitRepairGroup[] = [];
  const deductionsByUser = new Map<string, { xp: number; points: number }>();

  for (const group of groupsByKey.values()) {
    const sortedSubmissions = [...group.submissions].sort(compareSubmissions);
    let completionCountKept = 0;
    let deleteRemaining = false;
    const deletedSubmissions: WeeklyLimitRepairSubmission[] = [];

    for (const submission of sortedSubmissions) {
      if (
        deleteRemaining ||
        completionCountKept + submission.completionCount > group.task.maxPerWeek
      ) {
        deleteRemaining = true;
        deletedSubmissions.push(submission);
        continue;
      }

      completionCountKept += submission.completionCount;
    }

    if (deletedSubmissions.length === 0) continue;

    const completionCountBefore = sortedSubmissions.reduce(
      (sum, submission) => sum + submission.completionCount,
      0,
    );
    const completionCountDeleted = deletedSubmissions.reduce(
      (sum, submission) => sum + submission.completionCount,
      0,
    );
    const xpDeducted = completionCountDeleted * group.task.expReward;
    const pointsDeducted = completionCountDeleted * group.task.pointReward;

    groups.push({
      taskId: group.task.id,
      taskTitle: group.task.title,
      userId: group.user.id,
      userFullName: group.user.fullName,
      weekStart: group.weekStart,
      weekEnd: group.weekEnd,
      limit: group.task.maxPerWeek,
      completionCountBefore,
      completionCountKept,
      completionCountDeleted,
      submissionsBefore: sortedSubmissions.length,
      submissionsDeleted: deletedSubmissions.length,
      deletedSubmissionIds: deletedSubmissions.map((submission) => submission.id),
      xpDeducted,
      pointsDeducted,
    });

    const current = deductionsByUser.get(group.user.id) ?? { points: 0, xp: 0 };
    current.xp += xpDeducted;
    current.points += pointsDeducted;
    deductionsByUser.set(group.user.id, current);
  }

  const userDeductions = [...deductionsByUser.entries()].map(
    ([userId, deduction]) => {
      const user = userById.get(userId);
      if (!user) {
        throw new Error(`Không tìm thấy user ${userId} trong repair plan.`);
      }

      return {
        userId,
        userFullName: user.fullName,
        totalXpBefore: user.totalXp,
        totalXpAfter: Math.max(0, user.totalXp - deduction.xp),
        pointBalanceBefore: user.pointBalance,
        pointBalanceAfter: Math.max(0, user.pointBalance - deduction.points),
        xpDeducted: deduction.xp,
        pointsDeducted: deduction.points,
      };
    },
  );

  return {
    requestedFromDate: input.fromDate,
    effectiveFromDate: input.fromDate,
    groups,
    userDeductions,
    totals: {
      groupsScanned: groupsByKey.size,
      overflowGroups: groups.length,
      submissionsDeleted: groups.reduce(
        (sum, group) => sum + group.submissionsDeleted,
        0,
      ),
      completionCountDeleted: groups.reduce(
        (sum, group) => sum + group.completionCountDeleted,
        0,
      ),
      xpDeducted: userDeductions.reduce(
        (sum, deduction) => sum + deduction.xpDeducted,
        0,
      ),
      pointsDeducted: userDeductions.reduce(
        (sum, deduction) => sum + deduction.pointsDeducted,
        0,
      ),
    },
  };
}

function compareSubmissions(
  left: WeeklyLimitRepairSubmission,
  right: WeeklyLimitRepairSubmission,
) {
  return (
    left.submittedAt.getTime() - right.submittedAt.getTime() ||
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}

export async function repairWeeklyLimitOverflows(input: {
  fromDate: string;
  apply: boolean;
}): Promise<WeeklyLimitRepairPlan> {
  const dateRange = resolveWeeklyLimitRepairDateRange(input.fromDate);
  const taskRecords = await TaskModel.find(
    {
      isActive: true,
      maxPerWeek: { $ne: null },
      taskType: "WEEKLY_PER_MEMBER",
    },
    {
      _id: 1,
      expReward: 1,
      maxPerWeek: 1,
      pointReward: 1,
      title: 1,
    },
  ).lean();

  const tasks: WeeklyLimitRepairTask[] = taskRecords
    .filter((task) => typeof task.maxPerWeek === "number")
    .map((task) => ({
      id: task._id.toString(),
      title: task.title,
      maxPerWeek: task.maxPerWeek as number,
      expReward: task.expReward ?? 0,
      pointReward: task.pointReward ?? 0,
    }));

  if (tasks.length === 0) {
    return emptyPlan(dateRange);
  }

  const taskObjectIds = tasks.map((task) => new Types.ObjectId(task.id));
  const submissionRecords = await SubmissionModel.find(
    {
      completionCount: { $gt: 0 },
      date: { $gte: dateRange.effectiveFromDate },
      taskId: { $in: taskObjectIds },
    },
    {
      _id: 1,
      completionCount: 1,
      createdAt: 1,
      date: 1,
      subjectUserId: 1,
      submittedAt: 1,
      taskId: 1,
    },
  )
    .sort({ date: 1, submittedAt: 1, createdAt: 1, _id: 1 })
    .lean();

  const userIds = [
    ...new Set(
      submissionRecords.map((submission) => submission.subjectUserId.toString()),
    ),
  ];
  const userRecords = await UserModel.find(
    { _id: { $in: userIds.map((userId) => new Types.ObjectId(userId)) } },
    { _id: 1, fullName: 1, pointBalance: 1, totalXp: 1 },
  ).lean();

  const plan = planWeeklyLimitRepairs({
    fromDate: dateRange.effectiveFromDate,
    tasks,
    users: userRecords.map((user) => ({
      id: user._id.toString(),
      fullName: user.fullName,
      totalXp: user.totalXp ?? 0,
      pointBalance: user.pointBalance ?? 0,
    })),
    submissions: submissionRecords.map((submission) => ({
      id: submission._id.toString(),
      taskId: submission.taskId.toString(),
      subjectUserId: submission.subjectUserId.toString(),
      date: submission.date,
      completionCount: submission.completionCount ?? 0,
      submittedAt: submission.submittedAt ?? submission.createdAt,
      createdAt: submission.createdAt,
    })),
  });
  plan.requestedFromDate = dateRange.requestedFromDate;
  plan.effectiveFromDate = dateRange.effectiveFromDate;

  if (!input.apply || plan.totals.submissionsDeleted === 0) {
    return plan;
  }

  await applyWeeklyLimitRepairPlan(plan);

  return plan;
}

async function applyWeeklyLimitRepairPlan(plan: WeeklyLimitRepairPlan) {
  const execute = async (session: mongoose.ClientSession | null) => {
    const deletedSubmissionIds = plan.groups.flatMap(
      (group) => group.deletedSubmissionIds,
    );

    await SubmissionModel.deleteMany(
      { _id: { $in: deletedSubmissionIds.map((id) => new Types.ObjectId(id)) } },
      session ? { session } : undefined,
    );

    for (const deduction of plan.userDeductions) {
      await UserModel.updateOne(
        { _id: new Types.ObjectId(deduction.userId) },
        {
          $set: {
            pointBalance: deduction.pointBalanceAfter,
            totalXp: deduction.totalXpAfter,
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
    if (!isTransactionUnsupportedError(error)) {
      throw error;
    }
    await execute(null);
  } finally {
    await session.endSession();
  }
}

function isTransactionUnsupportedError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("Transaction numbers are only allowed") ||
      error.message.includes("replica set member or mongos"))
  );
}

function emptyPlan(dateRange = resolveWeeklyLimitRepairDateRange("2026-07-01")): WeeklyLimitRepairPlan {
  return {
    requestedFromDate: dateRange.requestedFromDate,
    effectiveFromDate: dateRange.effectiveFromDate,
    groups: [],
    userDeductions: [],
    totals: {
      groupsScanned: 0,
      overflowGroups: 0,
      submissionsDeleted: 0,
      completionCountDeleted: 0,
      xpDeducted: 0,
      pointsDeducted: 0,
    },
  };
}
