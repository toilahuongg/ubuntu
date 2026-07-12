import "server-only";

import {
  CAMPAIGN_TARGET_ROLES,
  isCampaignRole,
} from "@/lib/campaigns/constants";
import { loadAllDttClassTaskIdsForTeam } from "@/lib/dtt/class-task-service";
import { getTodayDateKey } from "@/lib/dates";
import type { SessionUser } from "@/lib/domain";
import {
  AuditLogModel,
  DailyCampaignModel,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type DailyCampaignRecord,
  type TaskRecord,
} from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import { listVisibleUsersForActor } from "@/lib/services/organization-service";
import { normalizeTaskType } from "@/lib/tasks/constants";
import { appliesToUser, type ScopeContext } from "@/lib/tasks/policy";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import {
  mapTask,
  sortTasksForDisplay,
  taskToScope,
} from "@/lib/tasks/task-service";
import type { CampaignReportEntry, TaskSummary } from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";

export type DailyCampaignAdminView = {
  date: string;
  campaignId: string | null;
  selectedTaskIds: string[];
  eligibleTasks: TaskSummary[];
  campaignOnlyTasks: TaskSummary[];
  report: CampaignReportEntry[];
};

export type DailyCampaignListItem = {
  date: string;
  id: string;
};

export function assertCanManageDailyCampaign(
  actor: SessionUser,
): asserts actor is SessionUser & { teamId: string } {
  if (actor.role !== "TEAM_LEAD" || !actor.teamId) {
    throw new Error("Chỉ CS - ĐL có Nhóm mới được quản lý chiến dịch.");
  }
}

export function normalizeCampaignTaskIds(taskIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const taskId of taskIds.map((id) => id.trim()).filter(Boolean)) {
    if (seen.has(taskId)) continue;
    seen.add(taskId);
    result.push(taskId);
  }
  return result;
}

export function resolveCampaignReportDate(input: {
  availableDates: readonly string[];
  requestedDate: string | null | undefined;
  todayDate: string;
}) {
  if (
    input.requestedDate &&
    input.availableDates.includes(input.requestedDate)
  ) {
    return input.requestedDate;
  }

  return input.todayDate;
}

export function assertEditableCampaignDate(dateKey: string, now = new Date()) {
  if (dateKey !== getTodayDateKey(now)) {
    throw new Error("Chỉ được tạo hoặc sửa chiến dịch trong ngày hiện tại.");
  }
}

function campaignRoleUserShapes(teamId: string): Parameters<
  typeof appliesToUser
>[1][] {
  return CAMPAIGN_TARGET_ROLES.map((role) => ({
    regionId: null,
    role,
    teamId,
    zoneId: null,
  }));
}

export function isTaskEligibleForCampaign(
  task: TaskRecord,
  teamId: string,
  dateKey: string,
): boolean {
  if (!task.isActive) return false;
  if (task.teamId.toString() !== teamId) return false;
  if (task.scope !== "TEAM") return false;

  if (task.campaignOnly) {
    return normalizeTaskType(task.taskType) === "DAILY_PER_MEMBER";
  }

  if (!isTaskScheduledForDate(task, dateKey)) return false;
  const scope: ScopeContext = taskToScope(task);
  return campaignRoleUserShapes(teamId).some((user) =>
    appliesToUser(scope, user),
  );
}

export function buildCampaignReportRows(input: {
  taskIds: string[];
  users: Array<{
    id: string;
    fullName: string;
    role: CampaignReportEntry["role"];
  }>;
  applicableUserIdsByTaskId: Map<string, Set<string>>;
  completionByTaskUser: Map<string, number>;
}): CampaignReportEntry[] {
  return input.users
    .map((user) => {
      const statuses = input.taskIds.map((taskId) => {
        const applicable =
          input.applicableUserIdsByTaskId.get(taskId)?.has(user.id) ?? false;
        const completionCount =
          input.completionByTaskUser.get(`${taskId}:${user.id}`) ?? 0;
        return { taskId, applicable, completionCount };
      });
      const applicableStatuses = statuses.filter((status) => status.applicable);
      const completed = applicableStatuses.filter(
        (status) => status.completionCount > 0,
      ).length;

      return {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        completed,
        total: applicableStatuses.length,
        isComplete:
          applicableStatuses.length > 0 &&
          completed === applicableStatuses.length,
        statuses,
      };
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return b.completed - a.completed;
      if (a.total !== b.total) return b.total - a.total;
      return a.fullName.localeCompare(b.fullName, "vi") || a.id.localeCompare(b.id);
    });
}

export async function getDailyCampaignRecordForTeam(
  teamId: string | null | undefined,
  dateKey: string,
): Promise<DailyCampaignRecord | null> {
  if (!teamId) return null;
  await connectToDatabase();
  return (await DailyCampaignModel.findOne({
    date: dateKey,
    teamId: toObjectId(teamId),
  }).lean()) as DailyCampaignRecord | null;
}

export async function listDailyCampaignsForTeam(
  actor: SessionUser,
): Promise<DailyCampaignListItem[]> {
  assertCanManageDailyCampaign(actor);
  await connectToDatabase();

  const campaigns = (await DailyCampaignModel.find({
    teamId: toObjectId(actor.teamId),
  })
    .sort({ date: -1 })
    .select({ date: 1 })
    .lean()) as Array<Pick<DailyCampaignRecord, "_id" | "date">>;

  return campaigns.map((campaign) => ({
    date: campaign.date,
    id: campaign._id.toString(),
  }));
}

function buildCompletionByTaskUser(
  submissions: SubmissionRecordModel[],
): Map<string, number> {
  const completionByTaskUser = new Map<string, number>();
  for (const submission of submissions) {
    completionByTaskUser.set(
      `${submission.taskId.toString()}:${submission.subjectUserId.toString()}`,
      submission.completionCount ?? 0,
    );
  }
  return completionByTaskUser;
}

export async function getDailyCampaignAdminView(
  actor: SessionUser,
  dateKey: string,
): Promise<DailyCampaignAdminView> {
  assertCanManageDailyCampaign(actor);
  await connectToDatabase();

  const [campaign, tasks, visibleUsers, dttClassTaskIds] = await Promise.all([
    DailyCampaignModel.findOne({
      date: dateKey,
      teamId: toObjectId(actor.teamId),
    }).lean() as Promise<DailyCampaignRecord | null>,
    TaskModel.find({
      isActive: true,
      scope: "TEAM",
      teamId: toObjectId(actor.teamId),
    }).lean() as Promise<TaskRecord[]>,
    listVisibleUsersForActor(actor),
    loadAllDttClassTaskIdsForTeam(actor.teamId),
  ]);

  const eligibleTaskRecords = sortTasksForDisplay(
    tasks.filter(
      (task) =>
        !task.campaignOnly &&
        !dttClassTaskIds.has(task._id.toString()) &&
        isTaskEligibleForCampaign(task, actor.teamId, dateKey),
    ),
  );
  const campaignOnlyTaskRecords = sortTasksForDisplay(
    tasks.filter((task) => task.campaignOnly && !dttClassTaskIds.has(task._id.toString())),
  );
  const selectedTaskIds = campaign?.taskIds.map((id) => id.toString()) ?? [];
  const selectedTasks = selectedTaskIds
    .map((taskId) => tasks.find((task) => task._id.toString() === taskId))
    .filter((task): task is TaskRecord =>
      Boolean(task && isTaskEligibleForCampaign(task, actor.teamId, dateKey)),
    );
  const reportUsers = visibleUsers.filter((user) => isCampaignRole(user.role));
  const applicableUserIdsByTaskId = new Map<string, Set<string>>();

  for (const task of selectedTasks) {
    const taskId = task._id.toString();
    const scope = taskToScope(task);
    applicableUserIdsByTaskId.set(
      taskId,
      new Set(
        reportUsers
          .filter((user) => appliesToUser(scope, user))
          .map((user) => user.id),
      ),
    );
  }

  const submissions =
    selectedTasks.length > 0 && reportUsers.length > 0
      ? ((await SubmissionModel.find({
          date: dateKey,
          subjectUserId: { $in: reportUsers.map((user) => toObjectId(user.id)) },
          taskId: { $in: selectedTasks.map((task) => task._id) },
        }).lean()) as SubmissionRecordModel[])
      : [];
  const selectedEligibleTaskIds = selectedTasks.map((task) =>
    task._id.toString(),
  );

  return {
    date: dateKey,
    campaignId: campaign?._id.toString() ?? null,
    selectedTaskIds,
    eligibleTasks: eligibleTaskRecords.map(mapTask),
    campaignOnlyTasks: campaignOnlyTaskRecords.map(mapTask),
    report: buildCampaignReportRows({
      taskIds: selectedEligibleTaskIds,
      users: reportUsers,
      applicableUserIdsByTaskId,
      completionByTaskUser: buildCompletionByTaskUser(submissions),
    }),
  };
}

export function assertCampaignOnlyTaskCanSubmit(input: {
  campaignOnly: boolean;
  taskId: string;
  campaignTaskIds: string[];
}) {
  if (!input.campaignOnly) return;
  if (input.campaignTaskIds.includes(input.taskId)) return;
  throw new Error(
    "Nhiệm vụ chiến dịch chỉ được nộp khi nằm trong chiến dịch ngày này.",
  );
}

export async function saveDailyCampaign(
  actor: SessionUser,
  input: { date: string; taskIds: string[] },
): Promise<string> {
  assertCanManageDailyCampaign(actor);
  assertEditableCampaignDate(input.date);
  const taskIds = normalizeCampaignTaskIds(input.taskIds);
  if (taskIds.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một nhiệm vụ cho chiến dịch.");
  }

  await connectToDatabase();
  const tasks = (await TaskModel.find({
    _id: { $in: taskIds.map(toObjectId) },
  }).lean()) as TaskRecord[];
  const taskById = new Map(tasks.map((task) => [task._id.toString(), task]));

  for (const taskId of taskIds) {
    const task = taskById.get(taskId);
    if (!task || !isTaskEligibleForCampaign(task, actor.teamId, input.date)) {
      throw new Error("Có nhiệm vụ không hợp lệ cho chiến dịch ngày này.");
    }
  }

  const updated = (await DailyCampaignModel.findOneAndUpdate(
    { date: input.date, teamId: toObjectId(actor.teamId) },
    {
      $set: {
        taskIds: taskIds.map(toObjectId),
        updatedBy: toObjectId(actor.id),
      },
      $setOnInsert: {
        createdBy: toObjectId(actor.id),
        date: input.date,
        teamId: toObjectId(actor.teamId),
      },
    },
    { new: true, upsert: true },
  ).lean()) as DailyCampaignRecord;

  await AuditLogModel.create({
    action: "daily-campaign.saved",
    actorUserId: toObjectId(actor.id),
    entityId: updated._id.toString(),
    entityType: "DailyCampaign",
    metadata: { date: input.date, taskIds, teamId: actor.teamId },
  });

  return updated._id.toString();
}
