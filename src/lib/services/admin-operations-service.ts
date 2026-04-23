import "server-only";

import { getIsoWeekdayFromDateKey, getYearMonthFromDateKey } from "@/lib/dates";
import type { SerializedUser, SessionUser } from "@/lib/domain";
import { ROLE_LABELS } from "@/lib/domain";
import {
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
} from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import {
  getUserOrgContext,
  listVisibleUsersForActor,
} from "@/lib/services/organization-service";
import type {
  AdminOperationsMember,
  AdminOperationsPeriod,
  AdminOperationsSummary,
  AdminOperationsView,
} from "@/lib/services/admin-operations-types";
import { appliesToUser } from "@/lib/tasks/policy";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import { taskToScope } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";

type ProgressSlot = {
  assigned: boolean;
  completed: boolean;
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

export function getAdminOperationsPeriodDateKeys(dateKey: string) {
  const weekday = getIsoWeekdayFromDateKey(dateKey);
  const weekStart = shiftDateKey(dateKey, 1 - weekday);
  const weekEnd = shiftDateKey(dateKey, 7 - weekday);
  const [year, month] = getYearMonthFromDateKey(dateKey)
    .split("-")
    .map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(
    monthEndDay,
  ).padStart(2, "0")}`;

  return {
    day: [dateKey],
    week: enumerateDates(weekStart, weekEnd),
    month: enumerateDates(monthStart, monthEnd),
  } satisfies Record<AdminOperationsPeriod, string[]>;
}

export function summarizeProgressSlots(
  slots: readonly ProgressSlot[],
): AdminOperationsSummary {
  const assigned = slots.filter((slot) => slot.assigned).length;
  const completed = slots.filter((slot) => slot.assigned && slot.completed).length;
  return {
    assigned,
    completed,
    pending: Math.max(assigned - completed, 0),
    completionPercent:
      assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
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

function uniqueObjectIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter((id): id is string => !!id))).map(
    toObjectId,
  );
}

function submissionKey(taskId: string, userId: string, dateKey: string) {
  return `${taskId}:${userId}:${dateKey}`;
}

function emptySummary(): AdminOperationsSummary {
  return {
    assigned: 0,
    completed: 0,
    pending: 0,
    completionPercent: 0,
  };
}

function resolveScopeName(
  actor: SessionUser,
  users: SerializedUser[],
  context: Awaited<ReturnType<typeof getUserOrgContext>>,
) {
  if (actor.role === "TEAM_LEAD") return context.team?.name ?? "Toàn nhóm";
  if (actor.role === "ZONE_LEAD") return context.zone?.name ?? "Địa vực của tôi";
  if (actor.role === "REGIONAL_LEAD") {
    return context.region?.name ?? "Khu vực của tôi";
  }
  return users.length > 0 ? "Toàn hệ thống" : "Quản trị";
}

function resolveMemberStatus(summary: AdminOperationsSummary) {
  if (summary.assigned === 0) return "idle" as const;
  if (summary.pending > 0) return "needs_attention" as const;
  if (summary.completionPercent === 100) return "complete" as const;
  return "in_progress" as const;
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
  const periodDates = getAdminOperationsPeriodDateKeys(dateKey);
  const allDates = Array.from(
    new Set(Object.values(periodDates).flat()),
  ).sort();

  const emptyPeriods = {
    day: emptySummary(),
    week: emptySummary(),
    month: emptySummary(),
  };

  if (visibleUsers.length === 0) {
    return {
      scope: {
        role: actor.role,
        roleLabel: ROLE_LABELS[actor.role],
        name: resolveScopeName(actor, visibleUsers, orgContext),
        memberCount: 0,
      },
      periods: emptyPeriods,
      members: [],
      todayTasks: [],
    };
  }

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
    if (allDates.some((date) => isTaskScheduledForDate(task, date))) {
      scheduledTaskIds.add(task._id.toString());
    }
  }

  const submissions =
    scheduledTaskIds.size > 0
      ? ((await SubmissionModel.find({
          date: { $in: allDates },
          subjectUserId: { $in: visibleUsers.map((user) => toObjectId(user.id)) },
          taskId: {
            $in: Array.from(scheduledTaskIds).map((id) => toObjectId(id)),
          },
        }).lean()) as SubmissionRecordModel[])
      : [];

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

  const slotsByPeriod: Record<AdminOperationsPeriod, ProgressSlot[]> = {
    day: [],
    week: [],
    month: [],
  };
  const slotsByMember = new Map<
    string,
    Record<AdminOperationsPeriod, ProgressSlot[]>
  >();
  const todayTaskSlots = new Map<string, ProgressSlot[]>();

  for (const user of visibleUsers) {
    slotsByMember.set(user.id, {
      day: [],
      week: [],
      month: [],
    });
  }

  for (const task of tasks) {
    const taskId = task._id.toString();
    const scope = taskToScope(task);

    for (const period of Object.keys(periodDates) as AdminOperationsPeriod[]) {
      for (const currentDate of periodDates[period]) {
        if (!isTaskScheduledForDate(task, currentDate)) continue;

        for (const user of visibleUsers) {
          if (!appliesToUser(scope, userShape(user))) continue;

          const slot = {
            assigned: true,
            completed: completedSlots.has(
              submissionKey(taskId, user.id, currentDate),
            ),
          };
          slotsByPeriod[period].push(slot);
          slotsByMember.get(user.id)?.[period].push(slot);

          if (period === "day") {
            const taskSlots = todayTaskSlots.get(taskId) ?? [];
            taskSlots.push(slot);
            todayTaskSlots.set(taskId, taskSlots);
          }
        }
      }
    }
  }

  const members = visibleUsers
    .map((user) => {
      const memberSlots = slotsByMember.get(user.id) ?? {
        day: [],
        week: [],
        month: [],
      };
      const periods = {
        day: summarizeProgressSlots(memberSlots.day),
        week: summarizeProgressSlots(memberSlots.week),
        month: summarizeProgressSlots(memberSlots.month),
      };
      return {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role],
        todayPending: periods.day.pending,
        status: resolveMemberStatus(periods.day),
        periods,
      };
    })
    .sort((a, b) => {
      const statusWeight = (status: AdminOperationsMember["status"]) =>
        status === "needs_attention" ? 0 : status === "in_progress" ? 1 : 2;
      const statusDiff = statusWeight(a.status) - statusWeight(b.status);
      if (statusDiff !== 0) return statusDiff;
      const pendingDiff = b.todayPending - a.todayPending;
      if (pendingDiff !== 0) return pendingDiff;
      const percentDiff =
        a.periods.day.completionPercent - b.periods.day.completionPercent;
      if (percentDiff !== 0) return percentDiff;
      return a.fullName.localeCompare(b.fullName, "vi");
    });

  const todayTasks = tasks
    .map((task) => {
      const taskId = task._id.toString();
      const summary = summarizeProgressSlots(todayTaskSlots.get(taskId) ?? []);
      return {
        id: taskId,
        title: task.title,
        deadlineAt: `${dateKey}T${task.deadlineTime}:00`,
        assigned: summary.assigned,
        completed: summary.completed,
        pending: summary.pending,
        completionPercent: summary.completionPercent,
      };
    })
    .filter((task) => task.assigned > 0)
    .sort((a, b) => {
      const pendingDiff = b.pending - a.pending;
      if (pendingDiff !== 0) return pendingDiff;
      return a.deadlineAt.localeCompare(b.deadlineAt);
    });

  return {
    scope: {
      role: actor.role,
      roleLabel: ROLE_LABELS[actor.role],
      name: resolveScopeName(actor, visibleUsers, orgContext),
      memberCount: visibleUsers.length,
    },
    periods: {
      day: summarizeProgressSlots(slotsByPeriod.day),
      week: summarizeProgressSlots(slotsByPeriod.week),
      month: summarizeProgressSlots(slotsByPeriod.month),
    },
    members,
    todayTasks,
  };
}
