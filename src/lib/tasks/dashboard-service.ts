import "server-only";

import type { Role, SerializedUser, SessionUser, TaskScope } from "@/lib/domain";
import { createDeadlineAt, getYearMonthFromDateKey } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  MonthlyGoalModel,
  type MonthlyGoalRecord,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
} from "@/lib/models";
import { listVisibleUsersForActor } from "@/lib/services/organization-service";
import { getUserProgress } from "@/lib/services/gamification-service";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_POINT_REWARD,
  DEFAULT_TASK_TYPE,
} from "@/lib/tasks/constants";
import { appliesToUser } from "@/lib/tasks/policy";
import {
  computeTaskStatus,
  mapTask,
  taskToScope,
} from "@/lib/tasks/task-service";
import type {
  DashboardRosterEntry,
  DashboardView,
  LeaderDashboardView,
  MemberDashboardView,
  ScopeLabel,
  TaskCard,
  TemplateCoverage,
} from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";

function userShape(
  u: Pick<SerializedUser, "teamId" | "zoneId" | "regionId" | "role">,
): Pick<SerializedUser, "teamId" | "zoneId" | "regionId" | "role"> {
  return {
    teamId: u.teamId ?? null,
    zoneId: u.zoneId ?? null,
    regionId: u.regionId ?? null,
    role: u.role,
  };
}

type VisibleScopeData = {
  visibleUsers: SerializedUser[];
  relevantTasks: TaskRecord[];
  allTasks: TaskRecord[];
  submissions: SubmissionRecordModel[];
};

async function loadScopeDataForVisibleUsers(
  dateKey: string,
  visibleUsers: SerializedUser[],
): Promise<VisibleScopeData> {
  const uniqueIds = (ids: (string | null | undefined)[]) =>
    Array.from(new Set(ids.filter((id): id is string => !!id))).map(toObjectId);
  const teamIds = uniqueIds(visibleUsers.map((u) => u.teamId));
  const zoneIds = uniqueIds(visibleUsers.map((u) => u.zoneId));
  const regionIds = uniqueIds(visibleUsers.map((u) => u.regionId));

  const scopeClauses: Record<string, unknown>[] = [
    { scope: "TEAM", teamId: { $in: teamIds } },
    { scope: "ZONE", zoneId: { $in: zoneIds } },
    { scope: "REGION", regionId: { $in: regionIds } },
  ];

  const allTasks = (await TaskModel.find({
    isActive: true,
    $or: scopeClauses,
  })
    .sort({ createdAt: -1 })
    .lean()) as TaskRecord[];

  const relevantTasks = allTasks.filter((t) => {
    const scope = taskToScope(t);
    return visibleUsers.some((u) => appliesToUser(scope, userShape(u)));
  });

  const submissions = (await SubmissionModel.find({
    date: dateKey,
    taskId: { $in: relevantTasks.map((t) => t._id) },
    subjectUserId: { $in: visibleUsers.map((u) => toObjectId(u.id)) },
  }).lean()) as SubmissionRecordModel[];

  return { visibleUsers, relevantTasks, allTasks, submissions };
}

function visibleScopesForRole(role: Role): ReadonlySet<TaskScope> {
  if (role === "TEAM_LEAD") return new Set(["TEAM"]);
  if (role === "ZONE_LEAD") return new Set(["TEAM", "ZONE"]);
  return new Set(["TEAM", "ZONE", "REGION"]);
}

async function loadVisibleTasksAndSubs(
  actor: SessionUser,
  dateKey: string,
): Promise<VisibleScopeData> {
  await connectToDatabase();
  if (!actor.teamId) {
    return { visibleUsers: [], relevantTasks: [], allTasks: [], submissions: [] };
  }
  const visibleUsers = await listVisibleUsersForActor(actor);
  const data = await loadScopeDataForVisibleUsers(dateKey, visibleUsers);
  const allowed = visibleScopesForRole(actor.role);
  return {
    ...data,
    allTasks: data.allTasks.filter((t) => allowed.has(t.scope)),
    relevantTasks: data.relevantTasks.filter((t) => allowed.has(t.scope)),
  };
}

function resolveScopeLabel(actor: SessionUser): ScopeLabel {
  if (actor.role === "REGIONAL_LEAD") return "REGION";
  if (actor.role === "ZONE_LEAD") return "ZONE";
  return "TEAM";
}

type ProgressAggregates = {
  totalByTask: Map<string, number>;
  monthlyByTaskUser: Map<string, number>;
  goalByTaskUser: Map<string, number>;
};

function aggKey(taskId: string, userId: string) {
  return `${taskId}:${userId}`;
}

async function loadProgressAggregates(
  tasks: TaskRecord[],
  userIds: string[],
  dateKey: string,
): Promise<ProgressAggregates> {
  const totalByTask = new Map<string, number>();
  const monthlyByTaskUser = new Map<string, number>();
  const goalByTaskUser = new Map<string, number>();

  const countTasks = tasks.filter(
    (t) => (t.taskType ?? DEFAULT_TASK_TYPE) === "COUNT_TOTAL",
  );
  const monthlyTasks = tasks.filter(
    (t) => (t.taskType ?? DEFAULT_TASK_TYPE) === "MONTHLY_PER_MEMBER",
  );

  if (countTasks.length > 0) {
    const totals = (await SubmissionModel.aggregate([
      { $match: { taskId: { $in: countTasks.map((t) => t._id) } } },
      { $group: { _id: "$taskId", total: { $sum: "$completionCount" } } },
    ])) as { _id: unknown; total: number }[];
    for (const row of totals) {
      totalByTask.set(String(row._id), row.total);
    }
  }

  if (monthlyTasks.length > 0 && userIds.length > 0) {
    const yearMonth = getYearMonthFromDateKey(dateKey);
    const userObjectIds = userIds.map((id) => toObjectId(id));
    const monthly = (await SubmissionModel.aggregate([
      {
        $match: {
          taskId: { $in: monthlyTasks.map((t) => t._id) },
          subjectUserId: { $in: userObjectIds },
          date: { $regex: `^${yearMonth}` },
        },
      },
      {
        $group: {
          _id: { taskId: "$taskId", userId: "$subjectUserId" },
          total: { $sum: "$completionCount" },
        },
      },
    ])) as { _id: { taskId: unknown; userId: unknown }; total: number }[];
    for (const row of monthly) {
      monthlyByTaskUser.set(
        aggKey(String(row._id.taskId), String(row._id.userId)),
        row.total,
      );
    }

    const goals = (await MonthlyGoalModel.find({
      taskId: { $in: monthlyTasks.map((t) => t._id) },
      userId: { $in: userObjectIds },
      yearMonth,
    }).lean()) as MonthlyGoalRecord[];
    for (const g of goals) {
      goalByTaskUser.set(
        aggKey(g.taskId.toString(), g.userId.toString()),
        g.targetCount,
      );
    }
  }

  return { totalByTask, monthlyByTaskUser, goalByTaskUser };
}

function buildTaskCard(
  t: TaskRecord,
  ctx: {
    actorId: string;
    dateKey: string;
    submissions: SubmissionRecordModel[];
    visibleUsers: Array<
      Pick<SerializedUser, "teamId" | "zoneId" | "regionId" | "role">
    >;
    totalByTask: Map<string, number>;
    monthlyByTaskUser: Map<string, number>;
    goalByTaskUser: Map<string, number>;
  },
): TaskCard {
  const taskId = t._id.toString();
  const taskType = t.taskType ?? DEFAULT_TASK_TYPE;
  const scope = taskToScope(t);
  const applicable = ctx.visibleUsers.filter((u) =>
    appliesToUser(scope, userShape(u)),
  );
  const taskSubs = ctx.submissions.filter(
    (s) => s.taskId.toString() === taskId,
  );
  const mine = taskSubs.find((s) => s.subjectUserId.toString() === ctx.actorId);
  const distinctCompleters = new Set(
    taskSubs.map((s) => s.subjectUserId.toString()),
  );

  const progress =
    taskType === "COUNT_TOTAL"
      ? {
          kind: "TOTAL" as const,
          current: ctx.totalByTask.get(taskId) ?? 0,
          target: t.targetCount ?? null,
        }
      : {
          kind: "MONTHLY_MEMBER" as const,
          current: ctx.monthlyByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? 0,
          target: ctx.goalByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? null,
        };

  return {
    id: taskId,
    title: t.title,
    description: t.description,
    date: ctx.dateKey,
    deadlineAt: createDeadlineAt(ctx.dateKey, t.deadlineTime).toISOString(),
    expReward: t.expReward ?? DEFAULT_EXP_REWARD,
    pointReward: t.pointReward ?? DEFAULT_POINT_REWARD,
    status: computeTaskStatus(t, ctx.dateKey),
    completionCount: distinctCompleters.size,
    totalCount: applicable.length,
    myCompletionCount: mine?.completionCount ?? 0,
    taskType,
    progress,
  };
}

export async function buildDashboardView(
  actor: SessionUser,
  dateKey: string,
): Promise<DashboardView> {
  const { visibleUsers, relevantTasks, allTasks, submissions } =
    await loadVisibleTasksAndSubs(actor, dateKey);

  const sortedTasks = [...relevantTasks].sort((a, b) =>
    a.deadlineTime.localeCompare(b.deadlineTime),
  );

  const { totalByTask, monthlyByTaskUser, goalByTaskUser } =
    await loadProgressAggregates(sortedTasks, [actor.id], dateKey);

  const cards: TaskCard[] = sortedTasks.map((t) =>
    buildTaskCard(t, {
      actorId: actor.id,
      dateKey,
      submissions,
      visibleUsers,
      totalByTask,
      monthlyByTaskUser,
      goalByTaskUser,
    }),
  );

  const roster: DashboardRosterEntry[] = visibleUsers.map((user) => {
    const statuses = sortedTasks.map((t) => {
      const applicable = appliesToUser(taskToScope(t), userShape(user));
      const sub = submissions.find(
        (s) =>
          s.taskId.toString() === t._id.toString() &&
          s.subjectUserId.toString() === user.id,
      );
      return {
        taskId: t._id.toString(),
        applicable,
        completionCount: sub?.completionCount ?? 0,
      };
    });
    const applicableCount = statuses.filter((s) => s.applicable).length;
    const completed = statuses.filter(
      (s) => s.applicable && s.completionCount > 0,
    ).length;
    return {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      completed,
      pending: Math.max(applicableCount - completed, 0),
      statuses,
    };
  });

  const totalSlots = sortedTasks.reduce((sum, t) => {
    const scope = taskToScope(t);
    return (
      sum +
      visibleUsers.filter((u) => appliesToUser(scope, userShape(u))).length
    );
  }, 0);
  const completedSubmissions = submissions.length;

  return {
    date: dateKey,
    highlights: {
      visibleUsers: visibleUsers.length,
      completed: completedSubmissions,
      pending: Math.max(totalSlots - completedSubmissions, 0),
      completionPercent:
        totalSlots > 0
          ? Math.round((completedSubmissions / totalSlots) * 100)
          : 0,
    },
    cards,
    roster,
    tasks: allTasks.map(mapTask),
  };
}

export async function buildLeaderDashboard(
  actor: SessionUser,
  dateKey: string,
): Promise<LeaderDashboardView> {
  const view = await buildDashboardView(actor, dateKey);
  return { ...view, scopeLabel: resolveScopeLabel(actor) };
}

export async function buildMemberDashboard(
  actor: SessionUser,
  dateKey: string,
): Promise<MemberDashboardView> {
  const [{ relevantTasks, submissions }, progress] = await Promise.all([
    loadVisibleTasksAndSubs(actor, dateKey),
    getUserProgress(actor.id),
  ]);

  const actorShape = {
    teamId: actor.teamId ?? null,
    zoneId: actor.zoneId ?? null,
    regionId: actor.regionId ?? null,
    role: actor.role,
  };
  const personalTasks = relevantTasks.filter((t) =>
    appliesToUser(taskToScope(t), actorShape),
  );

  const sortedPersonal = [...personalTasks].sort((a, b) =>
    a.deadlineTime.localeCompare(b.deadlineTime),
  );

  const { totalByTask, monthlyByTaskUser, goalByTaskUser } =
    await loadProgressAggregates(sortedPersonal, [actor.id], dateKey);

  const cards: TaskCard[] = sortedPersonal.map((t) =>
    buildTaskCard(t, {
      actorId: actor.id,
      dateKey,
      submissions,
      visibleUsers: [
        {
          teamId: actor.teamId ?? null,
          zoneId: actor.zoneId ?? null,
          regionId: actor.regionId ?? null,
          role: actor.role,
        },
      ],
      totalByTask,
      monthlyByTaskUser,
      goalByTaskUser,
    }),
  );

  return {
    date: dateKey,
    cards,
    totalXp: progress.totalXp,
    level: progress.level,
    progressXp: progress.progressXp,
    nextLevelXp: progress.nextLevelXp,
    levelName: progress.levelInfo.nameVi,
    levelIcon: progress.levelInfo.icon,
  };
}

export async function getTemplateCoverageForActor(
  actor: SessionUser,
  dateKey: string,
): Promise<TemplateCoverage> {
  const { visibleUsers, relevantTasks, submissions } =
    await loadVisibleTasksAndSubs(actor, dateKey);

  const coverage: TemplateCoverage = {};
  for (const task of relevantTasks) {
    const scope = taskToScope(task);
    const applicable = visibleUsers.filter((u) =>
      appliesToUser(scope, userShape(u)),
    );
    const taskSubs = submissions.filter(
      (s) => s.taskId.toString() === task._id.toString(),
    );
    const distinct = new Set(
      taskSubs.map((s) => s.subjectUserId.toString()),
    );
    coverage[task._id.toString()] = {
      completed: distinct.size,
      applicable: applicable.length,
    };
  }
  return coverage;
}
