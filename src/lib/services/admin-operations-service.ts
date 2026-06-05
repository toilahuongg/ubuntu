import "server-only";

import { getYearMonthFromDateKey } from "@/lib/dates";
import type { SerializedUser, SessionUser } from "@/lib/domain";
import { ROLE_LABELS } from "@/lib/domain";
import {
  SubmissionModel,
  TaskModel,
  type SubmissionRecordModel,
  type TaskRecord,
} from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import type {
  AdminOperationsCompletionDay,
  AdminOperationsCompletionTask,
  AdminOperationsMember,
  AdminOperationsRegionNode,
  AdminOperationsSelection,
  AdminOperationsSummary,
  AdminOperationsTeamNode,
  AdminOperationsView,
  AdminOperationsZoneNode,
} from "@/lib/services/admin-operations-types";
import { normalizeTaskType } from "@/lib/tasks/constants";
import {
  getStructureSnapshot,
  getUserOrgContext,
  listVisibleUsersForActor,
} from "@/lib/services/organization-service";
import { appliesToUser } from "@/lib/tasks/policy";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import { taskToScope } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";

type ProgressCounter = {
  assigned: number;
  completed: number;
};

type AdminOperationsStructure = {
  regions: Array<{
    id: string;
    name: string;
    teamId: string;
    zoneId: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
  }>;
  zones: Array<{
    id: string;
    name: string;
    teamId: string;
  }>;
};

type BuildAdminOperationsViewModelInput = {
  actor: SessionUser;
  dateKey: string;
  orgContext: Awaited<ReturnType<typeof getUserOrgContext>>;
  structure: AdminOperationsStructure;
  submissions: SubmissionRecordModel[];
  tasks: TaskRecord[];
  visibleUsers: SerializedUser[];
};

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function enumerateDates(startKey: string, endKey: string) {
  const dates: string[] = [];
  let current = startKey;
  while (current <= endKey) {
    dates.push(current);
    current = shiftDateKey(current, 1);
  }
  return dates;
}

export function getAdminOperationsMonthDateKeys(dateKey: string) {
  const [year, month] = getYearMonthFromDateKey(dateKey)
    .split("-")
    .map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(
    monthEndDay,
  ).padStart(2, "0")}`;

  return enumerateDates(monthStart, monthEnd);
}

function createCounter(): ProgressCounter {
  return { assigned: 0, completed: 0 };
}

function buildCompletionDay(
  date: string,
  tasks: AdminOperationsCompletionTask[],
): AdminOperationsCompletionDay {
  return {
    completionCount: tasks.reduce(
      (total, task) => total + task.completionCount,
      0,
    ),
    date,
    tasks,
  };
}

function counterToSummary(counter: ProgressCounter): AdminOperationsSummary {
  return {
    assigned: counter.assigned,
    completed: counter.completed,
    pending: Math.max(counter.assigned - counter.completed, 0),
    completionPercent:
      counter.assigned > 0
        ? Math.round((counter.completed / counter.assigned) * 100)
        : 0,
  };
}

function addCounter(target: ProgressCounter, source: ProgressCounter) {
  target.assigned += source.assigned;
  target.completed += source.completed;
}

function memberStatusWeight(status: AdminOperationsMember["status"]) {
  if (status === "needs_attention") return 0;
  if (status === "in_progress") return 1;
  if (status === "complete") return 2;
  return 3;
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

function uniqueObjectIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter((id): id is string => !!id))).map(
    toObjectId,
  );
}

function submissionKey(taskId: string, userId: string, dateKey: string) {
  return `${taskId}:${userId}:${dateKey}`;
}

function resolveScopeName(
  actor: SessionUser,
  context: Awaited<ReturnType<typeof getUserOrgContext>>,
) {
  if (actor.role === "ADMIN") return "Toàn hệ thống";
  if (actor.role === "TEAM_LEAD") return context.team?.name ?? "Nhóm của tôi";
  if (actor.role === "ZONE_LEAD") return context.zone?.name ?? "Địa vực của tôi";
  if (actor.role === "REGIONAL_LEAD") {
    return context.region?.name ?? "Khu vực của tôi";
  }
  return "Phạm vi của tôi";
}

function resolveMemberStatus(summary: AdminOperationsSummary) {
  if (summary.assigned === 0) return "idle" as const;
  if (summary.pending === 0) return "complete" as const;
  if (summary.completed === 0) return "needs_attention" as const;
  return "in_progress" as const;
}

function buildSelectionDefaults(
  actor: SessionUser,
  structure: AdminOperationsStructure,
): AdminOperationsSelection {
  const firstTeamId = structure.teams[0]?.id ?? null;
  const firstZoneId = structure.zones[0]?.id ?? null;
  const firstRegionId = structure.regions[0]?.id ?? null;

  return {
    teamId:
      actor.role === "TEAM_LEAD" ||
      actor.role === "ZONE_LEAD" ||
      actor.role === "REGIONAL_LEAD"
        ? actor.teamId ?? firstTeamId
        : null,
    zoneId:
      actor.role === "ZONE_LEAD" || actor.role === "REGIONAL_LEAD"
        ? actor.zoneId ?? firstZoneId
        : null,
    regionId:
      actor.role === "REGIONAL_LEAD"
        ? actor.regionId ?? firstRegionId
        : null,
  };
}

export function buildAdminOperationsViewModel({
  actor,
  dateKey,
  orgContext,
  structure,
  submissions,
  tasks,
  visibleUsers,
}: BuildAdminOperationsViewModelInput): AdminOperationsView {
  const monthDates = getAdminOperationsMonthDateKeys(dateKey);
  const completedSlots = new Set(
    submissions
      .filter((submission) => (submission.completionCount ?? 0) > 0)
      .map((submission) =>
        submissionKey(
          submission.taskId.toString(),
          submission.subjectUserId.toString(),
          submission.date,
        ),
      ),
  );
  const taskById = new Map(tasks.map((task) => [task._id.toString(), task]));
  const userById = new Map(visibleUsers.map((user) => [user.id, user]));
  const completionTasksByMemberDate = new Map<
    string,
    Map<string, AdminOperationsCompletionTask[]>
  >();

  for (const submission of submissions) {
    const completionCount = submission.completionCount ?? 1;
    if (completionCount <= 0) continue;

    const taskId = submission.taskId.toString();
    const userId = submission.subjectUserId.toString();
    const task = taskById.get(taskId);
    const user = userById.get(userId);

    if (!task || !user) continue;
    if (!isTaskScheduledForDate(task, submission.date)) continue;
    if (!appliesToUser(taskToScope(task), userShape(user))) continue;

    const byDate =
      completionTasksByMemberDate.get(userId) ??
      new Map<string, AdminOperationsCompletionTask[]>();
    const tasksForDate = byDate.get(submission.date) ?? [];
    tasksForDate.push({
      completionCount,
      id: taskId,
      submittedAt: submission.submittedAt.toISOString(),
      taskType: normalizeTaskType(task.taskType),
      title: task.title,
    });
    tasksForDate.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    byDate.set(submission.date, tasksForDate);
    completionTasksByMemberDate.set(userId, byDate);
  }

  const rootCounter = createCounter();
  const memberCounters = new Map<string, ProgressCounter>();
  const memberTaskCounters = new Map<string, Map<string, ProgressCounter>>();

  for (const user of visibleUsers) {
    memberCounters.set(user.id, createCounter());
    memberTaskCounters.set(user.id, new Map<string, ProgressCounter>());
  }

  for (const task of tasks) {
    const taskId = task._id.toString();
    const scope = taskToScope(task);
    const scheduledDates = monthDates.filter((currentDate) =>
      isTaskScheduledForDate(task, currentDate),
    );

    if (scheduledDates.length === 0) continue;

    for (const currentDate of scheduledDates) {
      for (const user of visibleUsers) {
        if (!appliesToUser(scope, userShape(user))) continue;

        const counter = memberCounters.get(user.id);
        if (counter) {
          counter.assigned += 1;
          rootCounter.assigned += 1;

          if (completedSlots.has(submissionKey(taskId, user.id, currentDate))) {
            counter.completed += 1;
            rootCounter.completed += 1;
          }
        }

        const taskCounters = memberTaskCounters.get(user.id);
        if (taskCounters) {
          let taskCounter = taskCounters.get(taskId);
          if (!taskCounter) {
            taskCounter = createCounter();
            taskCounters.set(taskId, taskCounter);
          }
          taskCounter.assigned += 1;
          if (completedSlots.has(submissionKey(taskId, user.id, currentDate))) {
            taskCounter.completed += 1;
          }
        }
      }
    }
  }

  const members = visibleUsers
    .map((user) => {
      const summary = counterToSummary(memberCounters.get(user.id) ?? createCounter());
      const memberCompletionTasks = completionTasksByMemberDate.get(user.id);
      const taskCounters = memberTaskCounters.get(user.id);
      const taskProgresses = Array.from(taskCounters?.entries() ?? []).map(
        ([taskId, counter]) => ({
          taskId,
          assigned: counter.assigned,
          completed: counter.completed,
        }),
      );

      return {
        completionDays: monthDates.map((date) =>
          buildCompletionDay(date, memberCompletionTasks?.get(date) ?? []),
        ),
        id: user.id,
        fullName: user.fullName,
        regionId: user.regionId ?? null,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role],
        status: resolveMemberStatus(summary),
        summary,
        teamId: user.teamId ?? null,
        zoneId: user.zoneId ?? null,
        taskProgresses,
      } satisfies AdminOperationsMember;
    })
    .sort((a, b) => {
      const statusDiff = memberStatusWeight(a.status) - memberStatusWeight(b.status);
      if (statusDiff !== 0) return statusDiff;
      const pendingDiff = b.summary.pending - a.summary.pending;
      if (pendingDiff !== 0) return pendingDiff;
      const assignedDiff = b.summary.assigned - a.summary.assigned;
      if (assignedDiff !== 0) return assignedDiff;
      return a.fullName.localeCompare(b.fullName, "vi");
    });

  const memberCountByTeam = new Map<string, number>();
  const memberCountByZone = new Map<string, number>();
  const memberCountByRegion = new Map<string, number>();
  const teamCounters = new Map<string, ProgressCounter>();
  const zoneCounters = new Map<string, ProgressCounter>();
  const regionCounters = new Map<string, ProgressCounter>();

  for (const team of structure.teams) {
    teamCounters.set(team.id, createCounter());
  }
  for (const zone of structure.zones) {
    zoneCounters.set(zone.id, createCounter());
  }
  for (const region of structure.regions) {
    regionCounters.set(region.id, createCounter());
  }

  for (const member of members) {
    if (member.teamId) {
      memberCountByTeam.set(
        member.teamId,
        (memberCountByTeam.get(member.teamId) ?? 0) + 1,
      );
      addCounter(teamCounters.get(member.teamId) ?? createCounter(), member.summary);
    }
    if (member.zoneId) {
      memberCountByZone.set(
        member.zoneId,
        (memberCountByZone.get(member.zoneId) ?? 0) + 1,
      );
      addCounter(zoneCounters.get(member.zoneId) ?? createCounter(), member.summary);
    }
    if (member.regionId) {
      memberCountByRegion.set(
        member.regionId,
        (memberCountByRegion.get(member.regionId) ?? 0) + 1,
      );
      addCounter(regionCounters.get(member.regionId) ?? createCounter(), member.summary);
    }
  }

  const regionsByZone = new Map<string, AdminOperationsRegionNode[]>();
  for (const region of structure.regions) {
    const regionNode: AdminOperationsRegionNode = {
      id: region.id,
      memberCount: memberCountByRegion.get(region.id) ?? 0,
      name: region.name,
      summary: counterToSummary(regionCounters.get(region.id) ?? createCounter()),
      teamId: region.teamId,
      zoneId: region.zoneId,
    };
    const bucket = regionsByZone.get(region.zoneId) ?? [];
    bucket.push(regionNode);
    regionsByZone.set(region.zoneId, bucket);
  }

  const zonesByTeam = new Map<string, AdminOperationsZoneNode[]>();
  for (const zone of structure.zones) {
    const zoneNode: AdminOperationsZoneNode = {
      id: zone.id,
      memberCount: memberCountByZone.get(zone.id) ?? 0,
      name: zone.name,
      regions: regionsByZone.get(zone.id) ?? [],
      summary: counterToSummary(zoneCounters.get(zone.id) ?? createCounter()),
      teamId: zone.teamId,
    };
    const bucket = zonesByTeam.get(zone.teamId) ?? [];
    bucket.push(zoneNode);
    zonesByTeam.set(zone.teamId, bucket);
  }

  const teams: AdminOperationsTeamNode[] = structure.teams.map((team) => ({
    id: team.id,
    memberCount: memberCountByTeam.get(team.id) ?? 0,
    name: team.name,
    summary: counterToSummary(teamCounters.get(team.id) ?? createCounter()),
    zones: zonesByTeam.get(team.id) ?? [],
  }));

  const scheduledTaskIds = new Set<string>();
  for (const task of tasks) {
    if (monthDates.some((date) => isTaskScheduledForDate(task, date))) {
      scheduledTaskIds.add(task._id.toString());
    }
  }

  const activeTasks = tasks
    .filter((task) => scheduledTaskIds.has(task._id.toString()))
    .map((task) => ({
      id: task._id.toString(),
      title: task.title,
      taskType: normalizeTaskType(task.taskType),
    }));

  return {
    dateKey,
    members,
    scope: {
      memberCount: visibleUsers.length,
      name: resolveScopeName(actor, orgContext),
      role: actor.role,
      roleLabel: ROLE_LABELS[actor.role],
    },
    selectionDefaults: buildSelectionDefaults(actor, structure),
    summary: counterToSummary(rootCounter),
    tree: {
      teams,
    },
    tasks: activeTasks,
  };
}

async function fetchStructureForOperations(
  actor: SessionUser,
  visibleUsers: SerializedUser[],
) {
  const scopedSnapshot = await getStructureSnapshot(actor);
  const visibleTeamIds = new Set(
    visibleUsers.map((user) => user.teamId).filter((id): id is string => !!id),
  );
  const visibleZoneIds = new Set(
    visibleUsers.map((user) => user.zoneId).filter((id): id is string => !!id),
  );
  const visibleRegionIds = new Set(
    visibleUsers.map((user) => user.regionId).filter((id): id is string => !!id),
  );

  const teams = scopedSnapshot.teams
    .filter(
      (team) =>
        actor.role === "ADMIN" ||
        actor.role === "TEAM_LEAD" ||
        visibleTeamIds.has(team.id) ||
        scopedSnapshot.zones.some((zone) => zone.teamId === team.id) ||
        scopedSnapshot.regions.some((region) => region.teamId === team.id),
    )
    .map((team) => ({ id: team.id, name: team.name }));

  const zones = scopedSnapshot.zones
    .filter(
      (zone) =>
        actor.role === "ADMIN" ||
        actor.role === "TEAM_LEAD" ||
        actor.role === "ZONE_LEAD" ||
        visibleZoneIds.has(zone.id) ||
        scopedSnapshot.regions.some((region) => region.zoneId === zone.id),
    )
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      teamId: zone.teamId,
    }));

  const regions = scopedSnapshot.regions
    .filter(
      (region) =>
        actor.role === "ADMIN" ||
        actor.role === "TEAM_LEAD" ||
        actor.role === "ZONE_LEAD" ||
        actor.role === "REGIONAL_LEAD" ||
        visibleRegionIds.has(region.id),
    )
    .map((region) => ({
      id: region.id,
      name: region.name,
      teamId: region.teamId,
      zoneId: region.zoneId,
    }));

  return { teams, zones, regions };
}

export async function buildAdminOperationsView(
  actor: SessionUser,
  dateKey: string,
): Promise<AdminOperationsView> {
  await connectToDatabase();

  const [visibleUsers, orgContext] = await Promise.all([
    listVisibleUsersForActor(actor),
    getUserOrgContext(actor),
  ]);
  const structure = await fetchStructureForOperations(actor, visibleUsers);
  const monthDates = getAdminOperationsMonthDateKeys(dateKey);

  const teamIds = uniqueObjectIds(visibleUsers.map((user) => user.teamId));
  const zoneIds = uniqueObjectIds(visibleUsers.map((user) => user.zoneId));
  const regionIds = uniqueObjectIds(visibleUsers.map((user) => user.regionId));
  const scopeClauses: Record<string, unknown>[] = [];

  if (teamIds.length > 0) {
    scopeClauses.push({ scope: "TEAM", teamId: { $in: teamIds } });
  }
  if (zoneIds.length > 0) {
    scopeClauses.push({ scope: "ZONE", zoneId: { $in: zoneIds } });
  }
  if (regionIds.length > 0) {
    scopeClauses.push({ scope: "REGION", regionId: { $in: regionIds } });
  }

  const tasks =
    scopeClauses.length > 0
      ? ((await TaskModel.find({
          isActive: true,
          $or: scopeClauses,
        })
          .sort({ deadlineTime: 1, title: 1 })
          .lean()) as TaskRecord[])
      : [];

  const scheduledTaskIds = new Set<string>();
  for (const task of tasks) {
    if (monthDates.some((date) => isTaskScheduledForDate(task, date))) {
      scheduledTaskIds.add(task._id.toString());
    }
  }

  const submissions =
    visibleUsers.length > 0 && scheduledTaskIds.size > 0
      ? ((await SubmissionModel.find({
          date: { $in: monthDates },
          subjectUserId: { $in: visibleUsers.map((user) => toObjectId(user.id)) },
          taskId: {
            $in: Array.from(scheduledTaskIds).map((id) => toObjectId(id)),
          },
        }).lean()) as SubmissionRecordModel[])
      : [];

  return buildAdminOperationsViewModel({
    actor,
    dateKey,
    orgContext,
    structure,
    submissions,
    tasks,
    visibleUsers,
  });
}
