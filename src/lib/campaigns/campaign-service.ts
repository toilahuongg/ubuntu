import "server-only";

import { CAMPAIGN_TARGET_ROLES } from "@/lib/campaigns/constants";
import { getTodayDateKey } from "@/lib/dates";
import type { SessionUser } from "@/lib/domain";
import {
  AuditLogModel,
  DailyCampaignModel,
  TaskModel,
  type DailyCampaignRecord,
  type TaskRecord,
} from "@/lib/models";
import { connectToDatabase } from "@/lib/mongoose";
import { normalizeTaskType } from "@/lib/tasks/constants";
import { appliesToUser, type ScopeContext } from "@/lib/tasks/policy";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import { taskToScope } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";

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
