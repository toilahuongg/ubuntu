import "server-only";

import {
  buildCampaignReportRows,
  getDailyCampaignRecordForTeam,
  isTaskEligibleForCampaign,
} from "@/lib/campaigns/campaign-service";
import { isCampaignRole } from "@/lib/campaigns/constants";
import { getDailyScripture } from "@/lib/daily-scripture";
import type { Role, SerializedUser, SessionUser, TaskScope } from "@/lib/domain";
import { createDeadlineAt, getYearMonthFromDateKey, getWeekRangeFromDateKey } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  MonthlyGoalModel,
  type MonthlyGoalRecord,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  TaskReminderPreferenceModel,
  type TaskRecord,
  UserTaskVisibilityModel,
} from "@/lib/models";
import { listVisibleUsersForActor } from "@/lib/services/organization-service";
import { getCompletionTrend } from "@/lib/services/analytics-service";
import { getUserProgress } from "@/lib/services/gamification-service";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_POINT_REWARD,
  getTaskProgressUnitLabel,
  isDailyTaskType,
  isWeeklyTaskType,
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
  DailyCampaignView,
  LeaderDashboardView,
  MemberDashboardView,
  ScopeLabel,
  TaskCard,
  TaskProgress,
  TemplateCoverage,
} from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";
import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
import { buildDttClassTaskView, loadAllDttClassTaskIdsForTeam } from "@/lib/dtt/class-task-service";

function userShape(
  u: Pick<SerializedUser, "id" | "teamId" | "zoneId" | "regionId" | "role"> & { isDttUser?: boolean },
  dttUserIdsSet?: Set<string>,
) {
  return {
    teamId: u.teamId ?? null,
    zoneId: u.zoneId ?? null,
    regionId: u.regionId ?? null,
    role: u.role,
    isDttUser: u.isDttUser ?? (dttUserIdsSet ? dttUserIdsSet.has(u.id) : false),
  };
}

type VisibleScopeData = {
  visibleUsers: SerializedUser[];
  relevantTasks: TaskRecord[];
  allTasks: TaskRecord[];
  submissions: SubmissionRecordModel[];
  visibilityOverrides: Map<string, boolean>;
  dttUserIdsSet: Set<string>;
};

export function buildDashboardSubmissionDateFilter(
  tasks: TaskRecord[],
  dateKey: string,
) {
  const monthlyTasks = tasks.filter(
    (task) => normalizeTaskType(task.taskType) === "MONTHLY_PER_MEMBER",
  );
  const dailyScopedTasks = tasks.filter(
    (task) =>
      normalizeTaskType(task.taskType) !== "MONTHLY_PER_MEMBER" &&
      !isWeeklyTaskType(task.taskType),
  );
  const weeklyTasks = tasks.filter(
    (task) => isWeeklyTaskType(task.taskType),
  );
  const clauses = [];

  if (monthlyTasks.length > 0) {
    clauses.push({
      date: { $regex: `^${getYearMonthFromDateKey(dateKey)}` },
      taskId: { $in: monthlyTasks.map((task) => task._id) },
    });
  }
  if (dailyScopedTasks.length > 0) {
    clauses.push({
      date: dateKey,
      taskId: { $in: dailyScopedTasks.map((task) => task._id) },
    });
  }
  if (weeklyTasks.length > 0) {
    const weekRange = getWeekRangeFromDateKey(dateKey, 7);
    clauses.push({
      date: { $gte: weekRange.startStr, $lte: weekRange.endStr },
      taskId: { $in: weeklyTasks.map((task) => task._id) },
    });
  }

  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

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

type CampaignDashboardUser = DashboardVisibleUser & {
  fullName: string;
};

export function isTaskRelevantForVisibleUsers(
  task: TaskRecord,
  users: SerializedUser[],
  visibilityOverrides: Map<string, boolean>,
  dttUserIdsSet?: Set<string>,
) {
  const scope = taskToScope(task);
  return users.some((u) => {
    const override = visibilityOverrides.get(`${task._id.toString()}:${u.id}`);
    if (override === true) return true;
    return appliesToUser(scope, userShape(u, dttUserIdsSet));
  });
}

async function loadScopeDataForVisibleUsers(
  dateKey: string,
  visibleUsers: SerializedUser[],
  actorId?: string,
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

  const userIdsToQuery = visibleUsers.map((u) => toObjectId(u.id));
  if (actorId) {
    userIdsToQuery.push(toObjectId(actorId));
  }

  // Load DTT class task IDs to exclude them from the regular task view
  const primaryTeamId = visibleUsers.find((u) => u.teamId)?.teamId ?? null;
  const dttClassTaskIds = primaryTeamId
    ? await loadAllDttClassTaskIdsForTeam(primaryTeamId)
    : new Set<string>();

  const [allTasksRaw, dttEnrollments] = await Promise.all([
    TaskModel.find({
      campaignOnly: { $ne: true },
      isActive: true,
      $or: scopeClauses,
    })
      .sort({ createdAt: -1 })
      .lean() as Promise<TaskRecord[]>,
    DttEnrollmentModel.find({
      userId: { $in: userIdsToQuery },
    }).lean(),
  ]);

  // Filter out tasks assigned to any DTT class (exclusivity rule)
  const allTasks = allTasksRaw.filter(
    (t) => !dttClassTaskIds.has(t._id.toString()),
  );

  const dttUserIdsSet = new Set(dttEnrollments.map((e) => e.userId.toString()));

  const visibilities = await UserTaskVisibilityModel.find({
    userId: { $in: visibleUsers.map((u) => toObjectId(u.id)) },
    taskId: { $in: allTasks.map((t) => t._id) },
  }).lean();
  const visibilityOverrides = new Map<string, boolean>(
    visibilities.map((v) => [`${v.taskId.toString()}:${v.userId.toString()}`, v.isVisible])
  );

  const relevantTasks = allTasks.filter((t) => {
    return (
      isTaskScheduledForDate(t, dateKey) &&
      isTaskRelevantForVisibleUsers(t, visibleUsers, visibilityOverrides, dttUserIdsSet)
    );
  });

  const submissions = relevantTasks.length > 0
    ? ((await SubmissionModel.find({
        ...buildDashboardSubmissionDateFilter(relevantTasks, dateKey),
        subjectUserId: { $in: visibleUsers.map((u) => toObjectId(u.id)) },
      }).lean()) as SubmissionRecordModel[])
    : [];

  return { visibleUsers, relevantTasks, allTasks, submissions, visibilityOverrides, dttUserIdsSet };
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
    return {
      visibleUsers: [],
      relevantTasks: [],
      allTasks: [],
      submissions: [],
      visibilityOverrides: new Map(),
      dttUserIdsSet: new Set(),
    };
  }
  const visibleUsers = await listVisibleUsersForActor(actor);
  const data = await loadScopeDataForVisibleUsers(dateKey, visibleUsers, actor.id);
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
  weeklyByTaskUser: Map<string, number>;
  goalByTaskUser: Map<string, number>;
};

function aggKey(taskId: string, userId: string) {
  return `${taskId}:${userId}`;
}

function buildSubmissionKey(taskId: string, userId: string) {
  return `${taskId}:${userId}`;
}

export function buildDashboardLookup(
  tasks: TaskRecord[],
  visibleUsers: DashboardVisibleUser[],
  submissions: SubmissionRecordModel[],
  visibilityOverrides?: Map<string, boolean>,
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
    const applicableUsers = visibleUsers.filter((user) => {
      const override = visibilityOverrides?.get(`${taskId}:${user.id}`);
      if (override !== undefined) return override;
      return appliesToUser(scope, userShape(user));
    });
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
  const unitLabel = getTaskProgressUnitLabel(taskType);
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
  const weeklyByTaskUser = new Map<string, number>();
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

  const weeklyTasks = tasks.filter((t) => isWeeklyTaskType(t.taskType));
  if (weeklyTasks.length > 0 && userIds.length > 0) {
    const weekRange = getWeekRangeFromDateKey(dateKey, 7);
    const userObjectIds = userIds.map((id) => toObjectId(id));
    const weekly = (await SubmissionModel.aggregate([
      {
        $match: {
          taskId: { $in: weeklyTasks.map((t) => t._id) },
          subjectUserId: { $in: userObjectIds },
          date: { $gte: weekRange.startStr, $lte: weekRange.endStr },
        },
      },
      {
        $group: {
          _id: { taskId: "$taskId", userId: "$subjectUserId" },
          total: { $sum: "$completionCount" },
        },
      },
    ])) as { _id: { taskId: unknown; userId: unknown }; total: number }[];
    for (const row of weekly) {
      weeklyByTaskUser.set(
        aggKey(String(row._id.taskId), String(row._id.userId)),
        row.total,
      );
    }
  }

  return { totalByTask, monthlyByTaskUser, weeklyByTaskUser, goalByTaskUser };
}

export function buildTaskCard(
  t: TaskRecord,
  ctx: {
    actorId: string;
    actorShape: Pick<SerializedUser, "teamId" | "zoneId" | "regionId" | "role">;
    dateKey: string;
    lookup: DashboardLookup;
    totalByTask: Map<string, number>;
    monthlyByTaskUser: Map<string, number>;
    weeklyByTaskUser: Map<string, number>;
    goalByTaskUser: Map<string, number>;
    reminderByTaskId: Map<string, { enabled: boolean; reminderTime: string }>;
  },
): TaskCard {
  const taskId = t._id.toString();
  const taskType = normalizeTaskType(t.taskType);
  const applicable = ctx.lookup.applicableUsersByTaskId.get(taskId) ?? [];
  const taskSubs = ctx.lookup.submissionsByTaskId.get(taskId) ?? [];
  const isApplicableToActor =
    ctx.lookup.applicableUserIdsByTaskId.get(taskId)?.has(ctx.actorId) ?? false;
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
      : taskType === "WEEKLY_PER_MEMBER"
        ? buildTaskProgress({
            taskType,
            current: ctx.weeklyByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? 0,
            target: t.maxPerWeek ?? null,
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
    weeklyCompletion: taskType === "WEEKLY_PER_MEMBER"
      ? ctx.weeklyByTaskUser.get(aggKey(taskId, ctx.actorId)) ?? 0
      : 0,
    maxPerWeek: t.maxPerWeek ?? null,
  };
}

async function buildDailyCampaignView(input: {
  actor: SessionUser;
  dateKey: string;
  users: CampaignDashboardUser[];
  dttUserIdsSet: Set<string>;
  visibilityOverrides: Map<string, boolean>;
}): Promise<DailyCampaignView | null> {
  const { actor, dateKey, dttUserIdsSet, users, visibilityOverrides } = input;
  const campaign = await getDailyCampaignRecordForTeam(actor.teamId, dateKey);
  if (!campaign || campaign.taskIds.length === 0 || !actor.teamId) {
    return null;
  }
  const teamId = actor.teamId;
  const campaignUsers = users.filter((user) => isCampaignRole(user.role));
  if (campaignUsers.length === 0) {
    return null;
  }

  const campaignTaskIdStrings = campaign.taskIds.map((id) => id.toString());
  const campaignTasksRaw = (await TaskModel.find({
    _id: { $in: campaign.taskIds },
    isActive: true,
    teamId: toObjectId(teamId),
  }).lean()) as TaskRecord[];
  const taskById = new Map(
    campaignTasksRaw.map((task) => [task._id.toString(), task]),
  );
  const campaignTasks = campaignTaskIdStrings
    .map((taskId) => taskById.get(taskId))
    .filter((task): task is TaskRecord =>
      Boolean(task && isTaskEligibleForCampaign(task, teamId, dateKey)),
    )
    .filter((task) => normalizeTaskType(task.taskType) !== "COUNT_TOTAL");

  if (campaignTasks.length === 0) {
    return null;
  }

  const userIds = campaignUsers.map((user) => toObjectId(user.id));
  const taskIds = campaignTasks.map((task) => task._id);
  const [submissions, reminderPreferences] = await Promise.all([
    SubmissionModel.find({
      date: dateKey,
      subjectUserId: { $in: userIds },
      taskId: { $in: taskIds },
    }).lean() as Promise<SubmissionRecordModel[]>,
    TaskReminderPreferenceModel.find({
      taskId: { $in: taskIds },
      userId: toObjectId(actor.id),
    })
      .select({ enabled: 1, reminderTime: 1, taskId: 1 })
      .lean(),
  ]);
  const reminderByTaskId = new Map(
    reminderPreferences.map((p) => [
      p.taskId.toString(),
      { enabled: p.enabled, reminderTime: p.reminderTime },
    ]),
  );

  const dashboardUsers = campaignUsers.map((user) => ({
    ...user,
    isDttUser: dttUserIdsSet.has(user.id),
  }));
  const lookup = buildDashboardLookup(
    campaignTasks,
    dashboardUsers,
    submissions,
    visibilityOverrides,
  );
  const { totalByTask, monthlyByTaskUser, weeklyByTaskUser, goalByTaskUser } =
    await loadProgressAggregates(
      campaignTasks,
      campaignUsers.map((user) => user.id),
      dateKey,
    );
  const actorShape = userShape(actor, dttUserIdsSet);
  const actorCampaignTasks = campaignTasks.filter((task) => {
    const taskId = task._id.toString();
    const override = visibilityOverrides.get(`${taskId}:${actor.id}`);
    if (override !== undefined) return override;
    return appliesToUser(taskToScope(task), actorShape);
  });
  const cards = actorCampaignTasks.map((task) =>
    buildTaskCard(task, {
      actorId: actor.id,
      actorShape,
      dateKey,
      lookup,
      totalByTask,
      monthlyByTaskUser,
      weeklyByTaskUser,
      goalByTaskUser,
      reminderByTaskId,
    }),
  );
  const completionByTaskUser = new Map<string, number>();
  for (const submission of submissions) {
    const taskId = submission.taskId.toString();
    const userId = submission.subjectUserId.toString();
    completionByTaskUser.set(
      buildSubmissionKey(taskId, userId),
      submission.completionCount ?? 0,
    );
  }
  const taskIdStrings = campaignTasks.map((task) => task._id.toString());

  return {
    id: campaign._id.toString(),
    date: dateKey,
    taskIds: taskIdStrings,
    cards,
    report: buildCampaignReportRows({
      taskIds: taskIdStrings,
      users: campaignUsers,
      applicableUserIdsByTaskId: lookup.applicableUserIdsByTaskId,
      completionByTaskUser,
    }),
  };
}

export async function buildDashboardView(
  actor: SessionUser,
  dateKey: string,
): Promise<DashboardView> {
  const { visibleUsers, relevantTasks, allTasks, submissions, visibilityOverrides, dttUserIdsSet } =
    await loadVisibleTasksAndSubs(actor, dateKey);

  const filteredRelevantTasks = relevantTasks.filter(
    (t) => normalizeTaskType(t.taskType) !== "COUNT_TOTAL",
  );
  const filteredAllTasks = allTasks.filter(
    (t) => normalizeTaskType(t.taskType) !== "COUNT_TOTAL",
  );
  const campaign = await buildDailyCampaignView({
    actor,
    dateKey,
    dttUserIdsSet,
    users: visibleUsers,
    visibilityOverrides,
  });
  const campaignTaskIds = new Set(campaign?.taskIds ?? []);

  const sortedTasks = sortTasksForDisplay(
    filteredRelevantTasks.filter(
      (task) => !campaignTaskIds.has(task._id.toString()),
    ),
  );
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

  const { totalByTask, monthlyByTaskUser, weeklyByTaskUser, goalByTaskUser } =
    await loadProgressAggregates(sortedTasks, [actor.id], dateKey);
  const actorShape = userShape(actor, dttUserIdsSet);
  const lookup = buildDashboardLookup(
    sortedTasks,
    visibleUsers.map((u) => ({ ...u, isDttUser: dttUserIdsSet.has(u.id) })),
    submissions,
    visibilityOverrides,
  );

  const cards: TaskCard[] = sortedTasks.map((t) =>
    buildTaskCard(t, {
      actorId: actor.id,
      actorShape,
      dateKey,
      lookup,
      totalByTask,
      monthlyByTaskUser,
      weeklyByTaskUser,
      goalByTaskUser,
      reminderByTaskId,
    }),
  );
  const actorTaskIds = new Set(
    sortedTasks
      .filter((t) => {
        const taskId = t._id.toString();
        const override = visibilityOverrides.get(`${taskId}:${actor.id}`);
        if (override !== undefined) return override;
        return appliesToUser(taskToScope(t), actorShape);
      })
      .map((t) => t._id.toString()),
  );
  const goalNotice = buildDashboardGoalNotice(
    cards.filter((card) => actorTaskIds.has(card.id)),
  );

  const dttClassTasks = actor.teamId
    ? await buildDttClassTaskView(actor.id, actor.teamId, dateKey)
    : null;

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
    campaign,
    dttClassTasks,
    goalNotice,
    roster,
    tasks: sortTasksForDisplay(filteredAllTasks).map(mapTask),
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
    equipped: progress.equipped,
    scopeLabel: resolveScopeLabel(actor),
    trends,
    currentLevelXp: progress.currentLevelXp,
    totalXp: progress.totalXp,
    level: progress.level,
    progressXp: progress.progressXp,
    nextLevelXp: progress.nextLevelXp,
    levelName: progress.levelInfo.nameVi,
    levelDescription: progress.levelInfo.description,
    levelIcon: progress.levelInfo.icon,
  };
}

export async function buildMemberDashboard(
  actor: SessionUser,
  dateKey: string,
): Promise<MemberDashboardView> {
  const [
    { relevantTasks, submissions, visibilityOverrides, dttUserIdsSet },
    progress,
  ] = await Promise.all([
    loadVisibleTasksAndSubs(actor, dateKey),
    getUserProgress(actor.id),
  ]);

  const actorShape = {
    teamId: actor.teamId ?? null,
    zoneId: actor.zoneId ?? null,
    regionId: actor.regionId ?? null,
    role: actor.role,
  };
  const campaign = await buildDailyCampaignView({
    actor,
    dateKey,
    dttUserIdsSet,
    users: [
      {
        id: actor.id,
        fullName: actor.fullName,
        teamId: actor.teamId ?? null,
        zoneId: actor.zoneId ?? null,
        regionId: actor.regionId ?? null,
        role: actor.role,
      },
    ],
    visibilityOverrides,
  });
  const campaignTaskIds = new Set(campaign?.taskIds ?? []);
  const personalTasks = relevantTasks.filter((t) => {
    const taskId = t._id.toString();
    const override = visibilityOverrides.get(`${taskId}:${actor.id}`);
    const isApplicable = override !== undefined ? override : appliesToUser(taskToScope(t), actorShape);
    return (
      isApplicable &&
      normalizeTaskType(t.taskType) !== "COUNT_TOTAL" &&
      !campaignTaskIds.has(taskId)
    );
  });

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

  const { totalByTask, monthlyByTaskUser, weeklyByTaskUser, goalByTaskUser } =
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
    visibilityOverrides,
  );

  const cards: TaskCard[] = sortedPersonal.map((t) =>
    buildTaskCard(t, {
      actorId: actor.id,
      actorShape,
      dateKey,
      lookup,
      totalByTask,
      monthlyByTaskUser,
      weeklyByTaskUser,
      goalByTaskUser,
      reminderByTaskId,
    }),
  );
  const goalNotice = buildDashboardGoalNotice(cards);
  const dttClassTasks = actor.teamId
    ? await buildDttClassTaskView(actor.id, actor.teamId, dateKey)
    : null;

  return {
    date: dateKey,
    cards,
    campaign,
    dttClassTasks,
    goalNotice,
    dailyScripture: getDailyScripture(dateKey),
    equipped: progress.equipped,
    currentLevelXp: progress.currentLevelXp,
    totalXp: progress.totalXp,
    level: progress.level,
    progressXp: progress.progressXp,
    nextLevelXp: progress.nextLevelXp,
    levelName: progress.levelInfo.nameVi,
    levelDescription: progress.levelInfo.description,
    levelIcon: progress.levelInfo.icon,
  };
}

export async function buildMemberPrayerDashboard(
  actor: SessionUser,
  dateKey: string,
): Promise<MemberDashboardView> {
  const [{ relevantTasks, submissions, visibilityOverrides }, progress] = await Promise.all([
    loadVisibleTasksAndSubs(actor, dateKey),
    getUserProgress(actor.id),
  ]);

  const actorShape = {
    teamId: actor.teamId ?? null,
    zoneId: actor.zoneId ?? null,
    regionId: actor.regionId ?? null,
    role: actor.role,
  };
  const prayerTasks = relevantTasks.filter((t) => {
    const taskId = t._id.toString();
    const override = visibilityOverrides.get(`${taskId}:${actor.id}`);
    const isApplicable = override !== undefined ? override : appliesToUser(taskToScope(t), actorShape);
    return isApplicable && normalizeTaskType(t.taskType) === "COUNT_TOTAL";
  });

  const sortedPersonal = sortTasksForDisplay(prayerTasks);
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

  const { totalByTask, monthlyByTaskUser, weeklyByTaskUser, goalByTaskUser } =
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
    visibilityOverrides,
  );

  const cards: TaskCard[] = sortedPersonal.map((t) =>
    buildTaskCard(t, {
      actorId: actor.id,
      actorShape,
      dateKey,
      lookup,
      totalByTask,
      monthlyByTaskUser,
      weeklyByTaskUser,
      goalByTaskUser,
      reminderByTaskId,
    }),
  );
  const goalNotice = buildDashboardGoalNotice(cards);
  const dttClassTasks = actor.teamId
    ? await buildDttClassTaskView(actor.id, actor.teamId, dateKey)
    : null;

  return {
    date: dateKey,
    cards,
    campaign: null,
    dttClassTasks,
    goalNotice,
    dailyScripture: getDailyScripture(dateKey),
    currentLevelXp: progress.currentLevelXp,
    totalXp: progress.totalXp,
    level: progress.level,
    progressXp: progress.progressXp,
    nextLevelXp: progress.nextLevelXp,
    levelName: progress.levelInfo.nameVi,
    levelDescription: progress.levelInfo.description,
    levelIcon: progress.levelInfo.icon,
  };
}

export async function buildLeaderPrayerDashboard(
  actor: SessionUser,
  dateKey: string,
): Promise<LeaderDashboardView> {
  const [progress, trends] = await Promise.all([
    getUserProgress(actor.id),
    getCompletionTrend(actor, 14, "SELF"),
  ]);

  const { visibleUsers, relevantTasks, allTasks, submissions, visibilityOverrides } =
    await loadVisibleTasksAndSubs(actor, dateKey);

  const prayerRelevantTasks = relevantTasks.filter(
    (t) => normalizeTaskType(t.taskType) === "COUNT_TOTAL",
  );
  const prayerAllTasks = allTasks.filter(
    (t) => normalizeTaskType(t.taskType) === "COUNT_TOTAL",
  );

  const sortedTasks = sortTasksForDisplay(prayerRelevantTasks);
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

  const { totalByTask, monthlyByTaskUser, weeklyByTaskUser, goalByTaskUser } =
    await loadProgressAggregates(sortedTasks, [actor.id], dateKey);
  const actorShape = {
    teamId: actor.teamId ?? null,
    zoneId: actor.zoneId ?? null,
    regionId: actor.regionId ?? null,
    role: actor.role,
  };
  const lookup = buildDashboardLookup(sortedTasks, visibleUsers, submissions, visibilityOverrides);

  const cards: TaskCard[] = sortedTasks.map((t) =>
    buildTaskCard(t, {
      actorId: actor.id,
      actorShape,
      dateKey,
      lookup,
      totalByTask,
      monthlyByTaskUser,
      weeklyByTaskUser,
      goalByTaskUser,
      reminderByTaskId,
    }),
  );
  const actorTaskIds = new Set(
    sortedTasks
      .filter((t) => {
        const taskId = t._id.toString();
        const override = visibilityOverrides.get(`${taskId}:${actor.id}`);
        if (override !== undefined) return override;
        return appliesToUser(taskToScope(t), actorShape);
      })
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

  const dttClassTasks = actor.teamId
    ? await buildDttClassTaskView(actor.id, actor.teamId, dateKey)
    : null;

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
    campaign: null,
    dttClassTasks,
    goalNotice,
    roster,
    tasks: sortTasksForDisplay(prayerAllTasks).map(mapTask),
    dailyScripture: getDailyScripture(dateKey),
    scopeLabel: resolveScopeLabel(actor),
    trends,
    currentLevelXp: progress.currentLevelXp,
    totalXp: progress.totalXp,
    level: progress.level,
    progressXp: progress.progressXp,
    nextLevelXp: progress.nextLevelXp,
    levelName: progress.levelInfo.nameVi,
    levelDescription: progress.levelInfo.description,
    levelIcon: progress.levelInfo.icon,
  };
}

export async function getTemplateCoverageForActor(
  actor: SessionUser,
  dateKey: string,
): Promise<TemplateCoverage> {
  const { visibleUsers, relevantTasks, submissions, visibilityOverrides } =
    await loadVisibleTasksAndSubs(actor, dateKey);
  const lookup = buildDashboardLookup(relevantTasks, visibleUsers, submissions, visibilityOverrides);

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
