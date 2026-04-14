import "server-only";

import type { SessionUser, SerializedUser } from "@/lib/domain";
import { createDeadlineAt } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
} from "@/lib/models";
import {
  listTeamMembersForViewing,
  listVisibleUsersForActor,
} from "@/lib/services/organization-service";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_LATE_WINDOW_DAYS,
} from "@/lib/tasks/constants";
import {
  appliesToUser,
  canManageTask,
  isWithinLateWindow,
  resolveActorScope,
  type ScopeContext,
} from "@/lib/tasks/policy";
import type {
  RosterEntry,
  TaskDetail,
  TaskStatus,
  TaskSummary,
} from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";

export function taskToScope(
  task: Pick<TaskRecord, "scope" | "teamId" | "zoneId" | "regionId">,
): ScopeContext {
  return {
    scope: task.scope,
    teamId: task.teamId.toString(),
    zoneId: task.zoneId?.toString() ?? null,
    regionId: task.regionId?.toString() ?? null,
  };
}

export function computeTaskStatus(
  task: Pick<TaskRecord, "lateWindowDays">,
  dateKey: string,
  now: Date = new Date(),
): TaskStatus {
  const windowDays = task.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS;
  return isWithinLateWindow(dateKey, windowDays, now) ? "OPEN" : "LOCKED";
}

export function mapTask(record: TaskRecord): TaskSummary {
  return {
    id: record._id.toString(),
    title: record.title,
    description: record.description,
    deadlineTime: record.deadlineTime,
    expReward: record.expReward ?? DEFAULT_EXP_REWARD,
    lateWindowDays: record.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
    scope: record.scope,
    isActive: record.isActive,
    teamId: record.teamId.toString(),
    zoneId: record.zoneId?.toString() ?? null,
    regionId: record.regionId?.toString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function userShape(user: SessionUser | SerializedUser): Pick<
  SerializedUser,
  "teamId" | "zoneId" | "regionId" | "role"
> {
  return {
    teamId: user.teamId ?? null,
    zoneId: user.zoneId ?? null,
    regionId: user.regionId ?? null,
    role: user.role,
  };
}

export async function getTaskDetail(
  actor: SessionUser,
  taskId: string,
  dateKey: string,
  selectedSubjectId?: string,
): Promise<TaskDetail> {
  await connectToDatabase();

  const task = (await TaskModel.findById(taskId).lean()) as TaskRecord | null;

  if (!task) {
    throw new Error("Nhiệm vụ không còn tồn tại.");
  }

  const scope = taskToScope(task);

  const [visibleUsers, viewableUsers, submissions] = await Promise.all([
    listVisibleUsersForActor(actor),
    actor.role === "MEMBER"
      ? listTeamMembersForViewing(actor)
      : listVisibleUsersForActor(actor),
    SubmissionModel.find({
      date: dateKey,
      taskId: toObjectId(taskId),
    }).lean() as Promise<SubmissionRecordModel[]>,
  ]);

  const rosterMembers = visibleUsers.filter((user) =>
    appliesToUser(scope, userShape(user)),
  );
  const displayMembers = viewableUsers.filter((user) =>
    appliesToUser(scope, userShape(user)),
  );

  if (rosterMembers.length === 0) {
    throw new Error("Bạn không có quyền xem nhiệm vụ này.");
  }

  const selectedSubject =
    (selectedSubjectId &&
      rosterMembers.find((user) => user.id === selectedSubjectId)) ||
    rosterMembers.find((user) => user.id === actor.id) ||
    rosterMembers[0];

  if (!selectedSubject) {
    throw new Error("Bạn chưa có đối tượng để nộp nhiệm vụ.");
  }

  const selectedSubmission = submissions.find(
    (s) => s.subjectUserId.toString() === selectedSubject.id,
  );

  const roster: RosterEntry[] = displayMembers.map((user) => {
    const sub = submissions.find(
      (s) => s.subjectUserId.toString() === user.id,
    );
    return {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      completionCount: sub?.completionCount ?? 0,
    };
  });

  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    date: dateKey,
    deadlineAt: createDeadlineAt(dateKey, task.deadlineTime).toISOString(),
    expReward: task.expReward ?? DEFAULT_EXP_REWARD,
    status: computeTaskStatus(task, dateKey),
    myCompletionCount: selectedSubmission?.completionCount ?? 0,
    selectedSubject,
    rosterMembers,
    roster,
  };
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  deadlineTime: string;
  expReward?: number;
  lateWindowDays?: number;
  isActive?: boolean;
};

export async function createTask(
  actor: SessionUser,
  input: CreateTaskInput,
): Promise<string> {
  const actorScope = resolveActorScope(actor);

  await connectToDatabase();

  const created = await TaskModel.create({
    createdBy: toObjectId(actor.id),
    deadlineTime: input.deadlineTime,
    description: input.description?.trim() ?? "",
    expReward: input.expReward ?? DEFAULT_EXP_REWARD,
    lateWindowDays: input.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
    isActive: input.isActive ?? true,
    regionId: actorScope.regionId ? toObjectId(actorScope.regionId) : null,
    scope: actorScope.scope,
    teamId: toObjectId(actorScope.teamId),
    title: input.title,
    zoneId: actorScope.zoneId ? toObjectId(actorScope.zoneId) : null,
  });

  await AuditLogModel.create({
    action: "task.created",
    actorUserId: toObjectId(actor.id),
    entityId: created._id.toString(),
    entityType: "Task",
    metadata: {
      scope: actorScope.scope,
      teamId: actorScope.teamId,
      title: input.title,
    },
  });

  return created._id.toString();
}

export async function toggleTask(
  actor: SessionUser,
  taskId: string,
): Promise<void> {
  await connectToDatabase();

  const record = (await TaskModel.findById(taskId).lean()) as TaskRecord | null;

  if (!record || !canManageTask(actor, taskToScope(record))) {
    throw new Error("Không tìm thấy nhiệm vụ phù hợp.");
  }

  const nextActive = !record.isActive;
  await TaskModel.updateOne(
    { _id: record._id },
    { $set: { isActive: nextActive } },
  );

  await AuditLogModel.create({
    action: "task.toggled",
    actorUserId: toObjectId(actor.id),
    entityId: taskId,
    entityType: "Task",
    metadata: { isActive: nextActive },
  });
}

export async function listTasksForActor(
  actor: SessionUser,
): Promise<TaskSummary[]> {
  if (!actor.teamId) {
    return [];
  }

  await connectToDatabase();
  const all = (await TaskModel.find({
    teamId: toObjectId(actor.teamId),
  })
    .sort({ createdAt: -1 })
    .lean()) as TaskRecord[];

  const filtered = all.filter((record) => {
    if (record.scope === "TEAM") return true;
    if (record.scope === "ZONE") {
      return !!actor.zoneId && record.zoneId?.toString() === actor.zoneId;
    }
    if (record.scope === "REGION") {
      return !!actor.regionId && record.regionId?.toString() === actor.regionId;
    }
    return false;
  });

  return filtered.map(mapTask);
}
