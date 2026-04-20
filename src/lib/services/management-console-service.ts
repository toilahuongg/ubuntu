import "server-only";

import type { Role, SerializedUser, SessionUser, TaskScope } from "@/lib/domain";
import { ROLE_LABELS, SCOPE_LABELS } from "@/lib/domain";
import {
  getTodayDateKey,
  getYearMonthFromDateKey,
} from "@/lib/dates";
import {
  MonthlyGoalModel,
  type MonthlyGoalRecord,
  RegionModel,
  type RegionRecord,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
  TeamModel,
  type TeamRecord,
  ZoneModel,
  type ZoneRecord,
} from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import {
  getCompletionTrend,
  getTaskDistribution,
  type TaskDistributionEntry,
  type TrendPoint,
} from "@/lib/services/analytics-service";
import {
  getUserOrgContext,
  listVisibleUsersForActor,
} from "@/lib/services/organization-service";
import {
  isDailyTaskType,
  supportsMonthlyGoal,
} from "@/lib/tasks/constants";
import { appliesToUser } from "@/lib/tasks/policy";
import { taskToScope } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";

export type ManagementScope = {
  kind: TaskScope;
  title: string;
  subtitle: string;
  subjectCount: number;
};

export type ManagementSummary = {
  taskCount: number;
  todayCompletedSlots: number;
  todayCompletionCount: number;
  todayPendingSlots: number;
  todayTotalSlots: number;
  todayCompletionPercent: number;
  monthlyGoalPairs: number;
  monthlyGoalSet: number;
  monthlyGoalMissing: number;
  monthlyGoalCoveragePercent: number;
  monthlyGoalTotal: number;
  monthlyCompletionTotal: number;
  monthlyProgressPercent: number;
};

export type ManagementMember = {
  id: string;
  fullName: string;
  role: Role;
  roleLabel: string;
  teamId: string | null;
  zoneId: string | null;
  regionId: string | null;
  teamName: string | null;
  zoneName: string | null;
  regionName: string | null;
  todayCompletedTasks: number;
  todayPendingTasks: number;
  todayTaskCount: number;
  todayCompletionCount: number;
  todayCompletionPercent: number;
  monthlyTaskCount: number;
  monthlyCompletion: number;
  monthlyGoal: number;
  monthlyGoalSetCount: number;
  monthlyGoalMissingCount: number;
  monthlyProgressPercent: number;
  hasMetMonthlyGoal: boolean;
};

export type ManagementTask = {
  id: string;
  title: string;
  scope: TaskScope;
  scopeLabel: string;
  taskType: TaskRecord["taskType"];
  unitLabel: "ngày" | "lượt";
  applicableCount: number;
  todayCompletedMembers: number;
  todayCompletionCount: number;
  todayCompletionPercent: number;
  monthlyGoalSupported: boolean;
  monthlyGoalSetCount: number;
  monthlyGoalMissingCount: number;
  monthlyGoalTotal: number;
  monthlyCompletionTotal: number;
  monthlyProgressPercent: number;
  targetCount: number | null;
};

export type ManagementGroup = {
  id: string;
  kind: "ZONE" | "REGION" | "MEMBER";
  name: string;
  memberCount: number;
  todayCompletedTasks: number;
  todayPendingTasks: number;
  todayCompletionPercent: number;
  monthlyCompletion: number;
  monthlyGoal: number;
  monthlyProgressPercent: number;
  monthlyGoalMissingCount: number;
};

export type ManagementInsightType =
  | "MISSING_GOAL"
  | "LOW_PROGRESS"
  | "NO_ACTIVITY"
  | "TOP_PERFORMER";

export type ManagementInsight = {
  type: ManagementInsightType;
  title: string;
  detail: string;
  tone: "warning" | "danger" | "success" | "neutral";
};

export type ManagementConsoleView = {
  date: string;
  yearMonth: string;
  scope: ManagementScope;
  summary: ManagementSummary;
  members: ManagementMember[];
  tasks: ManagementTask[];
  groups: ManagementGroup[];
  trends: TrendPoint[];
  taskDistribution: TaskDistributionEntry[];
  insights: ManagementInsight[];
};

type OrgLookup = {
  teams: Map<string, { name: string; code: string }>;
  zones: Map<string, { name: string; code: string }>;
  regions: Map<string, { name: string; code: string }>;
};

type BuildInput = {
  actor: SessionUser;
  dateKey: string;
  orgContext: Awaited<ReturnType<typeof getUserOrgContext>>;
  orgLookup: OrgLookup;
  visibleUsers: SerializedUser[];
  tasks: TaskRecord[];
  todaySubmissions: SubmissionRecordModel[];
  monthSubmissions: SubmissionRecordModel[];
  monthlyGoals: MonthlyGoalRecord[];
  trends: TrendPoint[];
  taskDistribution: TaskDistributionEntry[];
};

function visibleScopesForRole(role: Role): ReadonlySet<TaskScope> {
  if (role === "TEAM_LEAD") return new Set(["TEAM"]);
  if (role === "ZONE_LEAD") return new Set(["TEAM", "ZONE"]);
  if (role === "REGIONAL_LEAD") return new Set(["TEAM", "ZONE", "REGION"]);
  return new Set();
}

function resolveScopeKind(actor: SessionUser): TaskScope | null {
  if (actor.role === "TEAM_LEAD" && actor.teamId) return "TEAM";
  if (actor.role === "ZONE_LEAD" && actor.zoneId) return "ZONE";
  if (actor.role === "REGIONAL_LEAD" && actor.regionId) return "REGION";
  return null;
}

function formatOrgName(org: { code: string; name: string } | null) {
  return org ? `${org.name} (${org.code})` : null;
}

function buildScope(input: {
  actor: SessionUser;
  orgContext: Awaited<ReturnType<typeof getUserOrgContext>>;
  subjectCount: number;
}): ManagementScope | null {
  const kind = resolveScopeKind(input.actor);
  if (!kind) return null;

  const orgName =
    kind === "TEAM"
      ? formatOrgName(input.orgContext.team)
      : kind === "ZONE"
        ? formatOrgName(input.orgContext.zone)
        : formatOrgName(input.orgContext.region);

  return {
    kind,
    title:
      kind === "TEAM"
        ? "Điều hành nhóm"
        : kind === "ZONE"
          ? "Điều hành địa vực"
          : "Điều hành khu vực",
    subtitle: orgName ?? SCOPE_LABELS[kind],
    subjectCount: input.subjectCount,
  };
}

function userShape(
  user: Pick<SerializedUser, "teamId" | "zoneId" | "regionId" | "role">,
) {
  return {
    teamId: user.teamId ?? null,
    zoneId: user.zoneId ?? null,
    regionId: user.regionId ?? null,
    role: user.role,
  };
}

function completionKey(taskId: string, userId: string) {
  return `${taskId}:${userId}`;
}

function pct(current: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
}

function sumSubmissionCounts(
  submissions: SubmissionRecordModel[],
  taskIds: Set<string>,
  userIds: Set<string>,
) {
  const result = new Map<string, number>();
  for (const submission of submissions) {
    const taskId = submission.taskId.toString();
    const userId = submission.subjectUserId.toString();
    if (!taskIds.has(taskId) || !userIds.has(userId)) continue;
    const key = completionKey(taskId, userId);
    result.set(key, (result.get(key) ?? 0) + (submission.completionCount ?? 0));
  }
  return result;
}

function buildGroups(input: {
  actor: SessionUser;
  members: ManagementMember[];
}): ManagementGroup[] {
  const groupKind =
    input.actor.role === "TEAM_LEAD"
      ? "ZONE"
      : input.actor.role === "ZONE_LEAD"
        ? "REGION"
        : "MEMBER";
  const groups = new Map<string, ManagementGroup>();

  for (const member of input.members) {
    const id =
      groupKind === "ZONE"
        ? member.zoneId ?? "ungrouped-zone"
        : groupKind === "REGION"
          ? member.regionId ?? "ungrouped-region"
          : member.id;
    const name =
      groupKind === "ZONE"
        ? member.zoneName ?? "Chưa gán địa vực"
        : groupKind === "REGION"
          ? member.regionName ?? "Chưa gán khu vực"
          : member.fullName;
    const current =
      groups.get(id) ??
      ({
        id,
        kind: groupKind,
        name,
        memberCount: 0,
        todayCompletedTasks: 0,
        todayPendingTasks: 0,
        todayCompletionPercent: 0,
        monthlyCompletion: 0,
        monthlyGoal: 0,
        monthlyProgressPercent: 0,
        monthlyGoalMissingCount: 0,
      } satisfies ManagementGroup);

    current.memberCount += 1;
    current.todayCompletedTasks += member.todayCompletedTasks;
    current.todayPendingTasks += member.todayPendingTasks;
    current.monthlyCompletion += member.monthlyCompletion;
    current.monthlyGoal += member.monthlyGoal;
    current.monthlyGoalMissingCount += member.monthlyGoalMissingCount;
    groups.set(id, current);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      todayCompletionPercent: pct(
        group.todayCompletedTasks,
        group.todayCompletedTasks + group.todayPendingTasks,
      ),
      monthlyProgressPercent: pct(group.monthlyCompletion, group.monthlyGoal),
    }))
    .sort((a, b) => {
      if (b.monthlyProgressPercent !== a.monthlyProgressPercent) {
        return b.monthlyProgressPercent - a.monthlyProgressPercent;
      }
      return a.name.localeCompare(b.name, "vi");
    });
}

function buildInsights(input: {
  summary: ManagementSummary;
  members: ManagementMember[];
}): ManagementInsight[] {
  const insights: ManagementInsight[] = [];

  if (input.summary.monthlyGoalMissing > 0) {
    insights.push({
      type: "MISSING_GOAL",
      title: "Còn thiếu mục tiêu tháng",
      detail: `${input.summary.monthlyGoalMissing.toLocaleString("vi-VN")} mục tiêu cá nhân chưa được đặt.`,
      tone: "warning",
    });
  }

  if (
    input.summary.monthlyGoalTotal > 0 &&
    input.summary.monthlyProgressPercent < 50
  ) {
    insights.push({
      type: "LOW_PROGRESS",
      title: "Tiến độ tháng đang thấp",
      detail: `Toàn phạm vi mới đạt ${input.summary.monthlyProgressPercent}% mục tiêu tháng.`,
      tone: "danger",
    });
  }

  if (
    input.summary.todayTotalSlots > 0 &&
    input.summary.todayCompletedSlots === 0
  ) {
    insights.push({
      type: "NO_ACTIVITY",
      title: "Hôm nay chưa có kết quả",
      detail: "Chưa có thành viên nào hoàn thành nhiệm vụ áp dụng trong ngày.",
      tone: "neutral",
    });
  }

  const topMember = input.members
    .filter((member) => member.monthlyCompletion > 0)
    .sort((a, b) => b.monthlyCompletion - a.monthlyCompletion)[0];

  if (topMember) {
    insights.push({
      type: "TOP_PERFORMER",
      title: "Đóng góp nổi bật",
      detail: `${topMember.fullName} đang có ${topMember.monthlyCompletion.toLocaleString("vi-VN")} lượt trong tháng.`,
      tone: "success",
    });
  }

  return insights.slice(0, 4);
}

export function buildManagementConsoleFromData(
  input: BuildInput,
): ManagementConsoleView | null {
  const scope = buildScope({
    actor: input.actor,
    orgContext: input.orgContext,
    subjectCount: input.visibleUsers.length,
  });
  if (!scope) return null;

  const allowedScopes = visibleScopesForRole(input.actor.role);
  const visibleUsers = input.visibleUsers;
  const visibleUserIds = new Set(visibleUsers.map((user) => user.id));
  const relevantTasks = input.tasks.filter((task) => {
    if (!allowedScopes.has(task.scope)) return false;
    const scopeContext = taskToScope(task);
    return visibleUsers.some((user) => appliesToUser(scopeContext, userShape(user)));
  });
  const taskIds = new Set(relevantTasks.map((task) => task._id.toString()));
  const todayByTaskUser = sumSubmissionCounts(
    input.todaySubmissions,
    taskIds,
    visibleUserIds,
  );
  const monthByTaskUser = sumSubmissionCounts(
    input.monthSubmissions,
    taskIds,
    visibleUserIds,
  );
  const goalByTaskUser = new Map(
    input.monthlyGoals.map((goal) => [
      completionKey(goal.taskId.toString(), goal.userId.toString()),
      goal.targetCount,
    ]),
  );

  const tasks = relevantTasks.map((task): ManagementTask => {
    const taskId = task._id.toString();
    const scopeContext = taskToScope(task);
    const applicableUsers = visibleUsers.filter((user) =>
      appliesToUser(scopeContext, userShape(user)),
    );
    const monthlyGoalSupported = supportsMonthlyGoal(task.taskType);
    let todayCompletedMembers = 0;
    let todayCompletionCount = 0;
    let monthlyGoalSetCount = 0;
    let monthlyGoalTotal = 0;
    let monthlyCompletionTotal = 0;

    for (const user of applicableUsers) {
      const key = completionKey(taskId, user.id);
      const todayCount = todayByTaskUser.get(key) ?? 0;
      if (todayCount > 0) todayCompletedMembers += 1;
      todayCompletionCount += todayCount;

      if (monthlyGoalSupported) {
        const goal = goalByTaskUser.get(key);
        if (goal !== undefined) {
          monthlyGoalSetCount += 1;
          monthlyGoalTotal += goal;
        }
        monthlyCompletionTotal += monthByTaskUser.get(key) ?? 0;
      }
    }

    return {
      id: taskId,
      title: task.title,
      scope: task.scope,
      scopeLabel: SCOPE_LABELS[task.scope],
      taskType: task.taskType,
      unitLabel: isDailyTaskType(task.taskType) ? "ngày" : "lượt",
      applicableCount: applicableUsers.length,
      todayCompletedMembers,
      todayCompletionCount,
      todayCompletionPercent: pct(todayCompletedMembers, applicableUsers.length),
      monthlyGoalSupported,
      monthlyGoalSetCount,
      monthlyGoalMissingCount: monthlyGoalSupported
        ? Math.max(applicableUsers.length - monthlyGoalSetCount, 0)
        : 0,
      monthlyGoalTotal,
      monthlyCompletionTotal,
      monthlyProgressPercent: pct(monthlyCompletionTotal, monthlyGoalTotal),
      targetCount: task.targetCount ?? null,
    };
  });

  const members = visibleUsers.map((user): ManagementMember => {
    const applicableTasks = relevantTasks.filter((task) =>
      appliesToUser(taskToScope(task), userShape(user)),
    );
    const monthlyTasks = applicableTasks.filter((task) =>
      supportsMonthlyGoal(task.taskType),
    );
    let todayCompletedTasks = 0;
    let todayCompletionCount = 0;
    let monthlyCompletion = 0;
    let monthlyGoal = 0;
    let monthlyGoalSetCount = 0;

    for (const task of applicableTasks) {
      const key = completionKey(task._id.toString(), user.id);
      const todayCount = todayByTaskUser.get(key) ?? 0;
      if (todayCount > 0) todayCompletedTasks += 1;
      todayCompletionCount += todayCount;
    }

    for (const task of monthlyTasks) {
      const key = completionKey(task._id.toString(), user.id);
      monthlyCompletion += monthByTaskUser.get(key) ?? 0;
      const goal = goalByTaskUser.get(key);
      if (goal !== undefined) {
        monthlyGoalSetCount += 1;
        monthlyGoal += goal;
      }
    }

    const monthlyGoalMissingCount = Math.max(
      monthlyTasks.length - monthlyGoalSetCount,
      0,
    );

    return {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role],
      teamId: user.teamId ?? null,
      zoneId: user.zoneId ?? null,
      regionId: user.regionId ?? null,
      teamName: user.teamId
        ? (input.orgLookup.teams.get(user.teamId)?.name ?? null)
        : null,
      zoneName: user.zoneId
        ? (input.orgLookup.zones.get(user.zoneId)?.name ?? null)
        : null,
      regionName: user.regionId
        ? (input.orgLookup.regions.get(user.regionId)?.name ?? null)
        : null,
      todayCompletedTasks,
      todayPendingTasks: Math.max(applicableTasks.length - todayCompletedTasks, 0),
      todayTaskCount: applicableTasks.length,
      todayCompletionCount,
      todayCompletionPercent: pct(todayCompletedTasks, applicableTasks.length),
      monthlyTaskCount: monthlyTasks.length,
      monthlyCompletion,
      monthlyGoal,
      monthlyGoalSetCount,
      monthlyGoalMissingCount,
      monthlyProgressPercent: pct(monthlyCompletion, monthlyGoal),
      hasMetMonthlyGoal:
        monthlyGoal > 0 &&
        monthlyGoalMissingCount === 0 &&
        monthlyCompletion >= monthlyGoal,
    };
  });

  const todayTotalSlots = tasks.reduce(
    (sum, task) => sum + task.applicableCount,
    0,
  );
  const todayCompletedSlots = tasks.reduce(
    (sum, task) => sum + task.todayCompletedMembers,
    0,
  );
  const monthlyGoalPairs = tasks.reduce(
    (sum, task) =>
      sum + (task.monthlyGoalSupported ? task.applicableCount : 0),
    0,
  );
  const monthlyGoalSet = tasks.reduce(
    (sum, task) => sum + task.monthlyGoalSetCount,
    0,
  );
  const monthlyGoalTotal = tasks.reduce(
    (sum, task) => sum + task.monthlyGoalTotal,
    0,
  );
  const monthlyCompletionTotal = tasks.reduce(
    (sum, task) => sum + task.monthlyCompletionTotal,
    0,
  );

  const summary: ManagementSummary = {
    taskCount: tasks.length,
    todayCompletedSlots,
    todayCompletionCount: tasks.reduce(
      (sum, task) => sum + task.todayCompletionCount,
      0,
    ),
    todayPendingSlots: Math.max(todayTotalSlots - todayCompletedSlots, 0),
    todayTotalSlots,
    todayCompletionPercent: pct(todayCompletedSlots, todayTotalSlots),
    monthlyGoalPairs,
    monthlyGoalSet,
    monthlyGoalMissing: Math.max(monthlyGoalPairs - monthlyGoalSet, 0),
    monthlyGoalCoveragePercent: pct(monthlyGoalSet, monthlyGoalPairs),
    monthlyGoalTotal,
    monthlyCompletionTotal,
    monthlyProgressPercent: pct(monthlyCompletionTotal, monthlyGoalTotal),
  };

  return {
    date: input.dateKey,
    yearMonth: getYearMonthFromDateKey(input.dateKey),
    scope,
    summary,
    members: members.sort((a, b) => {
      if (b.monthlyProgressPercent !== a.monthlyProgressPercent) {
        return b.monthlyProgressPercent - a.monthlyProgressPercent;
      }
      return a.fullName.localeCompare(b.fullName, "vi");
    }),
    tasks: tasks.sort((a, b) => {
      if (b.monthlyProgressPercent !== a.monthlyProgressPercent) {
        return b.monthlyProgressPercent - a.monthlyProgressPercent;
      }
      return a.title.localeCompare(b.title, "vi");
    }),
    groups: buildGroups({ actor: input.actor, members }),
    trends: input.trends,
    taskDistribution: input.taskDistribution,
    insights: buildInsights({ summary, members }),
  };
}

function objectIdStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => !!value)));
}

async function loadOrgLookup(users: SerializedUser[]): Promise<OrgLookup> {
  const teamIds = objectIdStrings(users.map((user) => user.teamId)).map(toObjectId);
  const zoneIds = objectIdStrings(users.map((user) => user.zoneId)).map(toObjectId);
  const regionIds = objectIdStrings(users.map((user) => user.regionId)).map(
    toObjectId,
  );

  const [teams, zones, regions] = await Promise.all([
    teamIds.length > 0
      ? (TeamModel.find({ _id: { $in: teamIds } }).lean() as Promise<
          TeamRecord[]
        >)
      : Promise.resolve([]),
    zoneIds.length > 0
      ? (ZoneModel.find({ _id: { $in: zoneIds } }).lean() as Promise<
          ZoneRecord[]
        >)
      : Promise.resolve([]),
    regionIds.length > 0
      ? (RegionModel.find({ _id: { $in: regionIds } }).lean() as Promise<
          RegionRecord[]
        >)
      : Promise.resolve([]),
  ]);

  return {
    teams: new Map(
      teams.map((team) => [team._id.toString(), { code: team.code, name: team.name }]),
    ),
    zones: new Map(
      zones.map((zone) => [zone._id.toString(), { code: zone.code, name: zone.name }]),
    ),
    regions: new Map(
      regions.map((region) => [
        region._id.toString(),
        { code: region.code, name: region.name },
      ]),
    ),
  };
}

async function loadTasksForUsers(users: SerializedUser[]) {
  const teamIds = objectIdStrings(users.map((user) => user.teamId)).map(toObjectId);
  const zoneIds = objectIdStrings(users.map((user) => user.zoneId)).map(toObjectId);
  const regionIds = objectIdStrings(users.map((user) => user.regionId)).map(
    toObjectId,
  );

  const clauses: Record<string, unknown>[] = [];
  if (teamIds.length > 0) clauses.push({ scope: "TEAM", teamId: { $in: teamIds } });
  if (zoneIds.length > 0) clauses.push({ scope: "ZONE", zoneId: { $in: zoneIds } });
  if (regionIds.length > 0) {
    clauses.push({ scope: "REGION", regionId: { $in: regionIds } });
  }
  if (clauses.length === 0) return [];

  return (await TaskModel.find({
    isActive: true,
    $or: clauses,
  })
    .sort({ createdAt: -1 })
    .lean()) as TaskRecord[];
}

export async function getManagementConsoleView(
  actor: SessionUser,
  dateKey = getTodayDateKey(),
): Promise<ManagementConsoleView | null> {
  const kind = resolveScopeKind(actor);
  if (!kind) return null;

  await connectToDatabase();

  const yearMonth = getYearMonthFromDateKey(dateKey);
  const [visibleUsers, orgContext, trends, taskDistribution] = await Promise.all([
    listVisibleUsersForActor(actor),
    getUserOrgContext(actor),
    getCompletionTrend(actor, 14),
    getTaskDistribution(actor, 30, 10),
  ]);

  if (visibleUsers.length === 0) return null;

  const [orgLookup, allTasks] = await Promise.all([
    loadOrgLookup(visibleUsers),
    loadTasksForUsers(visibleUsers),
  ]);

  const allowedScopes = visibleScopesForRole(actor.role);
  const tasks = allTasks.filter((task) => allowedScopes.has(task.scope));
  const taskObjectIds = tasks.map((task) => task._id);
  const monthlyTasks = tasks.filter((task) => supportsMonthlyGoal(task.taskType));
  const visibleUserObjectIds = visibleUsers.map((user) => toObjectId(user.id));

  const [todaySubmissions, monthSubmissions, monthlyGoals] = await Promise.all([
    taskObjectIds.length > 0 && visibleUserObjectIds.length > 0
      ? (SubmissionModel.find({
          date: dateKey,
          subjectUserId: { $in: visibleUserObjectIds },
          taskId: { $in: taskObjectIds },
        }).lean() as Promise<SubmissionRecordModel[]>)
      : Promise.resolve([]),
    taskObjectIds.length > 0 && visibleUserObjectIds.length > 0
      ? (SubmissionModel.find({
          date: { $regex: `^${yearMonth}` },
          subjectUserId: { $in: visibleUserObjectIds },
          taskId: { $in: taskObjectIds },
        }).lean() as Promise<SubmissionRecordModel[]>)
      : Promise.resolve([]),
    monthlyTasks.length > 0 && visibleUserObjectIds.length > 0
      ? (MonthlyGoalModel.find({
          taskId: { $in: monthlyTasks.map((task) => task._id) },
          userId: { $in: visibleUserObjectIds },
          yearMonth,
        }).lean() as Promise<MonthlyGoalRecord[]>)
      : Promise.resolve([]),
  ]);

  return buildManagementConsoleFromData({
    actor,
    dateKey,
    orgContext,
    orgLookup,
    visibleUsers,
    tasks,
    todaySubmissions,
    monthSubmissions,
    monthlyGoals,
    trends,
    taskDistribution,
  });
}
