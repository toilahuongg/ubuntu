import "server-only";

import type { SerializedUser, SessionUser } from "@/lib/domain";
import { createDeadlineAt } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
} from "@/lib/models";
import { listVisibleUsersForActor } from "@/lib/services/organization-service";
import { getUserProgress } from "@/lib/services/gamification-service";
import { DEFAULT_EXP_REWARD } from "@/lib/tasks/constants";
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

function userShape(u: SerializedUser): Pick<
  SerializedUser,
  "teamId" | "zoneId" | "regionId" | "role"
> {
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

async function loadVisibleTasksAndSubs(
  actor: SessionUser,
  dateKey: string,
): Promise<VisibleScopeData> {
  await connectToDatabase();
  if (!actor.teamId) {
    return { visibleUsers: [], relevantTasks: [], allTasks: [], submissions: [] };
  }
  const visibleUsers = await listVisibleUsersForActor(actor);
  return loadScopeDataForVisibleUsers(dateKey, visibleUsers);
}

function resolveScopeLabel(actor: SessionUser): ScopeLabel {
  if (actor.role === "REGIONAL_LEAD") return "REGION";
  if (actor.role === "ZONE_LEAD") return "ZONE";
  return "TEAM";
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

  const cards: TaskCard[] = sortedTasks.map((t) => {
    const scope = taskToScope(t);
    const applicable = visibleUsers.filter((u) =>
      appliesToUser(scope, userShape(u)),
    );
    const taskSubs = submissions.filter(
      (s) => s.taskId.toString() === t._id.toString(),
    );
    const mine = taskSubs.find((s) => s.subjectUserId.toString() === actor.id);
    const distinctCompleters = new Set(
      taskSubs.map((s) => s.subjectUserId.toString()),
    );

    return {
      id: t._id.toString(),
      title: t.title,
      description: t.description,
      date: dateKey,
      deadlineAt: createDeadlineAt(dateKey, t.deadlineTime).toISOString(),
      expReward: t.expReward ?? DEFAULT_EXP_REWARD,
      status: computeTaskStatus(t, dateKey),
      completionCount: distinctCompleters.size,
      totalCount: applicable.length,
      myCompletionCount: mine?.completionCount ?? 0,
    };
  });

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

  const cards: TaskCard[] = sortedPersonal.map((t) => {
    const mine = submissions.find(
      (s) =>
        s.taskId.toString() === t._id.toString() &&
        s.subjectUserId.toString() === actor.id,
    );
    return {
      id: t._id.toString(),
      title: t.title,
      description: t.description,
      date: dateKey,
      deadlineAt: createDeadlineAt(dateKey, t.deadlineTime).toISOString(),
      expReward: t.expReward ?? DEFAULT_EXP_REWARD,
      status: computeTaskStatus(t, dateKey),
      completionCount: mine ? 1 : 0,
      totalCount: 1,
      myCompletionCount: mine?.completionCount ?? 0,
    };
  });

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
