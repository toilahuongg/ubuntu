import "server-only";

import { getDailyScripture } from "@/lib/daily-scripture";
import type { Role, SerializedUser, SessionUser, TaskScope } from "@/lib/domain";
import { createDeadlineAt, getYearMonthFromDateKey } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  MonthlyGoalModel,
  type MonthlyGoalRecord,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  TaskReminderPreferenceModel,
  type TaskRecord,
} from "@/lib/models";
import { listVisibleUsersForActor } from "@/lib/services/organization-service";
import { getCompletionTrend } from "@/lib/services/analytics-service";
import { getUserProgress } from "@/lib/services/gamification-service";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_POINT_REWARD,
  isDailyTaskType,
  normalizeTaskType,
  supportsMonthlyGoal,
} from "@/lib/tasks/constants";
import { appliesToUser } from "@/lib/tasks/policy";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import { resolveEffectiveReminderTime } from "@/lib/tasks/reminder-service";
import {
  computeTaskStatus,
  mapTask,
  sortTasksForDisplay,
  taskToScope,
} from "@/lib/tasks/task-service";
import type {
  DashboardGoalNotice,
  DashboardRosterEntry,
  DashboardView,
  LeaderDashboardView,
  MemberDashboardView,
  ScopeLabel,
  TaskCard,
  TaskProgress,
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

type DashboardVisibleUser = Pick<
  SerializedUser,
  "id" | "teamId" | "zoneId" | "regionId" | "role"
>;

type DashboardLookup = {
  applicableCount: number;
  applicableUserIdsByTaskId: Map<string, Set<string>>;
  applicableUsersByTaskId: Map<string, DashboardVisibleUser[]>;
  completedSubmissionCount: number;
  submissionByTaskUser: Map<string, SubmissionRecordModel>;
  submissionsByTaskId: Map<string, SubmissionRecordModel[]>;
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
    return (
      isTaskScheduledForDate(t, dateKey) &&
      visibleUsers.some((u) => appliesToUser(scope, userShape(u)))
    );
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
  if (actor.role !== "ADMIN" && !actor.teamId) {
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

function buildSubmissionKey(taskId: string, userId: string) {
  return `${taskId}:${userId}`;
}

function buildDashboardLookup(
  tasks: TaskRecord[],
  visibleUsers: DashboardVisibleUser[],
  submissions: SubmissionRecordModel[],
): DashboardLookup {
  const applicableUserIdsByTaskId = new Map<string, Set<string>>();
  const applicableUsersByTaskId = new Map<string, DashboardVisibleUser[]>();
  const submissionByTaskUser = new Map<string, SubmissionRecordModel>();
  const submissionsByTaskId = new Map<string, SubmissionRecordModel[]>();
  let applicableCount = 0;
  let completedSubmissionCount = 0;

  for (const task of tasks) {
    const taskId = task._id.toString();
    const scope = taskToScope(task);
    const applicableUsers = visibleUsers.filter((user) =>
      appliesToUser(scope, userShape(user)),
    );
    const applicableUserIds = new Set(applicableUsers.map((user) => user.id));

    applicableUsersByTaskId.set(taskId, applicableUsers);
    applicableUserIdsByTaskId.set(taskId, applicableUserIds);
    applicableCount += applicableUsers.length;
  }

  for (const submission of submissions) {
    const taskId = submission.taskId.toString();
    const userId = submission.subjectUserId.toString();
    if (!applicableUserIdsByTaskId.get(taskId)?.has(userId)) continue;

    submissionByTaskUser.set(buildSubmissionKey(taskId, userId), submission);
    const taskSubmissions = submissionsByTaskId.get(taskId) ?? [];
    taskSubmissions.push(submission);
    submissionsByTaskId.set(taskId, taskSubmissions);
    completedSubmissionCount += 1;
  }

  return {
    applicableCount,
    applicableUserIdsByTaskId,
    applicableUsersByTaskId,
    completedSubmissionCount,
    submissionByTaskUser,
    submissionsByTaskId,
  };
}

export function buildTaskProgress(input: {
  taskType: TaskRecord["taskType"];
  current: number;
  target: number | null;
}): TaskProgress {
  const taskType = normalizeTaskType(input.taskType);
  const supportsGoal = supportsMonthlyGoal(taskType);
  const unitLabel: TaskProgress["unitLabel"] =
    isDailyTaskType(taskType) ? "ngày" : "lượt";
  return {
    kind:
      taskType === "COUNT_TOTAL"
        ? ("TOTAL" as const)
        : taskType === "WEEKLY_PER_MEMBER"
          ? ("WEEKLY_MEMBER" as const)
        : isDailyTaskType(taskType)
          ? ("DAILY_MEMBER" as const)
          : ("MONTHLY_MEMBER" as const),
    current: input.current,
    target: input.target,
    unitLabel,
    isGoalMissing: supportsGoal && input.target === null,
    isGoalComplete: input.target !== null && input.current >= input.target,
  };
}

export function buildDashboardGoalNotice(
  cards: TaskCard[],
): DashboardGoalNotice | null {
  const tasks = cards
    .filter((card) => card.progress.isGoalMissing)
    .map((card) => ({
      id: card.id,
      title: card.title,
      taskType: card.taskType,
    }));

  return tasks.length > 0 ? { missingCount: tasks.length, tasks } : null;
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
    (t) => normalizeTaskType(t.taskType) === "COUNT_TOTAL",
  );
  const monthlyTasks = tasks.filter((t) => supportsMonthlyGoal(t.taskType));

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
    actorShape: Pick<SerializedUser, "teamId" | "zoneId" | "regionId" | "role">;
    dateKey: string;
    lookup: DashboardLookup;
    totalByTask: Map<string, number>;
    monthlyByTaskUser: Map<string, number>;
    goalByTaskUser: Map<string, number>;
    reminderByTaskId: Map<string, { enabled: boolean; reminderTime: string }>;
  },
): TaskCard {
  const taskId = t._id.toString();
  const taskType = normalizeTaskType(t.taskType);
  const scope = taskToScope(t);
  const applicable = ctx.lookup.applicableUsersByTaskId.get(taskId) ?? [];
  const taskSubs = ctx.lookup.submissionsByTaskId.get(taskId) ?? [];
  const isApplicableToActor = appliesToUser(scope, userShape(ctx.actorShape));
  const mine = ctx.lookup.submissionByTaskUser.get(
    buildSubmissionKey(taskId, ctx.actorId),
  );
  const distinctCompleters = new Set(
    taskSubs.map((s) => s.subjectUserId.toString()),
  );

  const progress =
    taskType === "COUNT_TOTAL"
      ? buildTaskProgress({
          taskType,
          current: ctx.totalByTask.get(taskId) ?? 0,
          target: t.targetCount ?? null,
        })
      : buildTaskProgress({
          taskType,
          current: ctx.monthlyByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? 0,
          target: ctx.goalByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? null,
        });
  const reminderPreference = ctx.reminderByTaskId.get(taskId);
  const reminderSettings = resolveEffectiveReminderTime({
    defaultReminderTime: t.deadlineTime,
    deadlineTime: t.deadlineTime,
    preference: reminderPreference ?? null,
  });

  return {
    id: taskId,
    title: t.title,
    description: t.description,
    date: ctx.dateKey,
    deadlineAt: createDeadlineAt(ctx.dateKey, t.deadlineTime).toISOString(),
    notificationTime: reminderSettings.effectiveReminderTime ?? t.deadlineTime,
    expReward: t.expReward ?? DEFAULT_EXP_REWARD,
    pointReward: t.pointReward ?? DEFAULT_POINT_REWARD,
    status: computeTaskStatus(t, ctx.dateKey),
    completionCount: distinctCompleters.size,
    totalCount: applicable.length,
    myCompletionCount: mine?.completionCount ?? 0,
    taskType,
    isApplicableToActor,
    progress,
  };
}

export async function buildDashboardView(
  actor: SessionUser,
  dateKey: string,
): Promise<DashboardView> {
  const { visibleUsers, relevantTasks, allTasks, submissions } =
    await loadVisibleTasksAndSubs(actor, dateKey);

  const sortedTasks = sortTasksForDisplay(relevantTasks);
  const taskObjectIds = sortedTasks.map((t) => t._id);
  const reminderPreferences =
    taskObjectIds.length > 0
      ? await TaskReminderPreferenceModel.find({
          taskId: { $in: taskObjectIds },
          userId: toObjectId(actor.id),
        })
          .select({ enabled: 1, reminderTime: 1, taskId: 1 })
          .lean()
      : [];
  const reminderByTaskId = new Map(
    reminderPreferences.map((p) => [
      p.taskId.toString(),
      { enabled: p.enabled, reminderTime: p.reminderTime },
    ]),
  );

  const { totalByTask, monthlyByTaskUser, goalByTaskUser } =
    await loadProgressAggregates(sortedTasks, [actor.id], dateKey);
  const actorShape = userShape(actor);
  const lookup = buildDashboardLookup(sortedTasks, visibleUsers, submissions);

  const cards: TaskCard[] = sortedTasks.map((t) =>
    buildTaskCard(t, {
      actorId: actor.id,
      actorShape,
      dateKey,
      lookup,
      totalByTask,
      monthlyByTaskUser,
      goalByTaskUser,
      reminderByTaskId,
    }),
  );
  const actorTaskIds = new Set(
    sortedTasks
      .filter((t) => appliesToUser(taskToScope(t), actorShape))
      .map((t) => t._id.toString()),
  );
  const goalNotice = buildDashboardGoalNotice(
    cards.filter((card) => actorTaskIds.has(card.id)),
  );

  const roster: DashboardRosterEntry[] = visibleUsers.map((user) => {
    const statuses = sortedTasks.map((t) => {
      const taskId = t._id.toString();
      const applicable = Boolean(
        lookup.applicableUserIdsByTaskId.get(taskId)?.has(user.id),
      );
      const sub = lookup.submissionByTaskUser.get(
        buildSubmissionKey(taskId, user.id),
      );
      return {
        taskId,
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

  const totalSlots = lookup.applicableCount;
  const completedSubmissions = lookup.completedSubmissionCount;

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
    goalNotice,
    roster,
    tasks: sortTasksForDisplay(allTasks).map(mapTask),
  };
}

export async function buildLeaderDashboard(
  actor: SessionUser,
  dateKey: string,
): Promise<LeaderDashboardView> {
  const [view, progress, trends] = await Promise.all([
    buildDashboardView(actor, dateKey),
    getUserProgress(actor.id),
    getCompletionTrend(actor, 14, "SELF"),
  ]);

  return {
    ...view,
    dailyScripture: getDailyScripture(dateKey),
    scopeLabel: resolveScopeLabel(actor),
    trends,
    totalXp: progress.totalXp,
    level: progress.level,
    progressXp: progress.progressXp,
    nextLevelXp: progress.nextLevelXp,
    levelName: progress.levelInfo.nameVi,
    levelIcon: progress.levelInfo.icon,
  };
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

  const sortedPersonal = sortTasksForDisplay(personalTasks);
  const personalTaskObjectIds = sortedPersonal.map((t) => t._id);
  const reminderPreferences =
    personalTaskObjectIds.length > 0
      ? await TaskReminderPreferenceModel.find({
          taskId: { $in: personalTaskObjectIds },
          userId: toObjectId(actor.id),
        })
          .select({ enabled: 1, reminderTime: 1, taskId: 1 })
          .lean()
      : [];
  const reminderByTaskId = new Map(
    reminderPreferences.map((p) => [
      p.taskId.toString(),
      { enabled: p.enabled, reminderTime: p.reminderTime },
    ]),
  );

  const { totalByTask, monthlyByTaskUser, goalByTaskUser } =
    await loadProgressAggregates(sortedPersonal, [actor.id], dateKey);
  const lookup = buildDashboardLookup(
    sortedPersonal,
    [
      {
        id: actor.id,
        teamId: actor.teamId ?? null,
        zoneId: actor.zoneId ?? null,
        regionId: actor.regionId ?? null,
        role: actor.role,
      },
    ],
    submissions,
  );

  const cards: TaskCard[] = sortedPersonal.map((t) =>
    buildTaskCard(t, {
      actorId: actor.id,
      actorShape,
      dateKey,
      lookup,
      totalByTask,
      monthlyByTaskUser,
      goalByTaskUser,
      reminderByTaskId,
    }),
  );
  const goalNotice = buildDashboardGoalNotice(cards);

  return {
    date: dateKey,
    cards,
    goalNotice,
    dailyScripture: getDailyScripture(dateKey),
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
  const lookup = buildDashboardLookup(relevantTasks, visibleUsers, submissions);

  const coverage: TemplateCoverage = {};
  for (const task of relevantTasks) {
    const taskId = task._id.toString();
    const applicable = lookup.applicableUsersByTaskId.get(taskId) ?? [];
    const taskSubs = lookup.submissionsByTaskId.get(taskId) ?? [];
    const distinct = new Set(taskSubs.map((s) => s.subjectUserId.toString()));
    coverage[task._id.toString()] = {
      completed: distinct.size,
      applicable: applicable.length,
    };
  }
  return coverage;
}
