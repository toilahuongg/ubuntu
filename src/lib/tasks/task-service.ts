import "server-only";

import {
  normalizeTargetRoles,
  type SessionUser,
  type SerializedUser,
  type TaskTargetRole,
} from "@/lib/domain";
import {
  createDeadlineAt,
  getTodayDateKey,
  getYearMonthFromDateKey,
} from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  MonthlyGoalModel,
  type MonthlyGoalRecord,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  TaskReminderPreferenceModel,
  type TaskRecord,
} from "@/lib/models";
import {
  listTeamMembersForViewing,
  listVisibleUsersForActor,
} from "@/lib/services/organization-service";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_LATE_WINDOW_DAYS,
  DEFAULT_POINT_REWARD,
  normalizeTaskType,
  supportsMonthlyGoal,
  type TaskType,
} from "@/lib/tasks/constants";
import {
  appliesToUser,
  canManageTask,
  isWithinLateWindow,
  resolveActorScope,
  type ScopeContext,
} from "@/lib/tasks/policy";
import type {
  BackfillDay,
  RosterEntry,
  TaskDetail,
  TaskStatus,
  TaskSummary,
} from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";

export function taskToScope(
  task: Pick<
    TaskRecord,
    "scope" | "teamId" | "zoneId" | "regionId" | "targetRoles"
  >,
): ScopeContext {
  return {
    scope: task.scope,
    teamId: task.teamId.toString(),
    zoneId: task.zoneId?.toString() ?? null,
    regionId: task.regionId?.toString() ?? null,
    targetRoles: normalizeTargetRoles(task.targetRoles),
  };
}

export function computeTaskStatus(
  task: Pick<TaskRecord, "lateWindowDays" | "completedAt">,
  dateKey: string,
  now: Date = new Date(),
): TaskStatus {
  if (task.completedAt) return "COMPLETED";
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
    pointReward: record.pointReward ?? DEFAULT_POINT_REWARD,
    lateWindowDays: record.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
    scope: record.scope,
    taskType: normalizeTaskType(record.taskType),
    targetCount: record.targetCount ?? null,
    targetRoles: normalizeTargetRoles(record.targetRoles),
    submissionMessage: record.submissionMessage ?? "",
    completionMessage: record.completionMessage ?? "",
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
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

export async function sumTaskCompletions(
  taskId: string,
  opts: { yearMonth?: string; subjectUserId?: string } = {},
): Promise<number> {
  const match: Record<string, unknown> = { taskId: toObjectId(taskId) };
  if (opts.yearMonth) {
    match.date = { $regex: `^${opts.yearMonth}` };
  }
  if (opts.subjectUserId) {
    match.subjectUserId = toObjectId(opts.subjectUserId);
  }
  const [row] = (await SubmissionModel.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$completionCount" } } },
  ])) as { total: number }[];
  return row?.total ?? 0;
}

export async function listSubjectMonthSubmissions(
  taskId: string,
  subjectUserId: string,
  yearMonth: string,
): Promise<Record<string, number>> {
  await connectToDatabase();
  const subs = (await SubmissionModel.find({
    taskId: toObjectId(taskId),
    subjectUserId: toObjectId(subjectUserId),
    date: { $regex: `^${yearMonth}` },
  }).lean()) as SubmissionRecordModel[];
  const result: Record<string, number> = {};
  for (const s of subs) {
    result[s.date] = (result[s.date] ?? 0) + (s.completionCount ?? 0);
  }
  return result;
}

export async function getMonthlyGoal(
  taskId: string,
  userId: string,
  yearMonth: string,
): Promise<MonthlyGoalRecord | null> {
  await connectToDatabase();
  return (await MonthlyGoalModel.findOne({
    taskId: toObjectId(taskId),
    userId: toObjectId(userId),
    yearMonth,
  }).lean()) as MonthlyGoalRecord | null;
}

export async function setMonthlyGoal(
  actor: SessionUser,
  taskId: string,
  yearMonth: string,
  targetCount: number,
): Promise<void> {
  if (!Number.isInteger(targetCount) || targetCount < 1) {
    throw new Error("Mục tiêu phải là số nguyên ≥ 1.");
  }
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new Error("Định dạng tháng không hợp lệ.");
  }

  await connectToDatabase();

  const task = (await TaskModel.findById(taskId).lean()) as TaskRecord | null;
  if (!task) throw new Error("Nhiệm vụ không còn tồn tại.");
  if (!supportsMonthlyGoal(task.taskType)) {
    throw new Error("Nhiệm vụ này không hỗ trợ đặt mục tiêu theo tháng.");
  }

  await MonthlyGoalModel.updateOne(
    {
      taskId: toObjectId(taskId),
      userId: toObjectId(actor.id),
      yearMonth,
    },
    { $set: { targetCount } },
    { upsert: true },
  );

  await AuditLogModel.create({
    action: "task.monthly-goal-set",
    actorUserId: toObjectId(actor.id),
    entityId: taskId,
    entityType: "Task",
    metadata: { yearMonth, targetCount },
  });
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

  const taskType = normalizeTaskType(task.taskType);
  const yearMonth = getYearMonthFromDateKey(dateKey);
  const scope = taskToScope(task);
  const isApplicableToActor = appliesToUser(scope, userShape(actor));

  const [visibleUsers, viewableUsers, submissionsToday, monthlySubmissions] =
    await Promise.all([
      listVisibleUsersForActor(actor),
      actor.role === "MEMBER" || actor.role === "NGV"
        ? listTeamMembersForViewing(actor)
        : listVisibleUsersForActor(actor),
      SubmissionModel.find({
        date: dateKey,
        taskId: toObjectId(taskId),
      }).lean() as Promise<SubmissionRecordModel[]>,
      supportsMonthlyGoal(taskType)
        ? (SubmissionModel.find({
            date: { $regex: `^${yearMonth}` },
            taskId: toObjectId(taskId),
          }).lean() as Promise<SubmissionRecordModel[]>)
        : Promise.resolve([] as SubmissionRecordModel[]),
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

  const selectedTodaySub = submissionsToday.find(
    (s) => s.subjectUserId.toString() === selectedSubject.id,
  );
  const rosterMemberIds = new Set(rosterMembers.map((user) => user.id));

  const totalAcrossAll =
    taskType === "COUNT_TOTAL" ? await sumTaskCompletions(taskId) : 0;

  const perMemberMonthly = new Map<string, number>();
  if (supportsMonthlyGoal(taskType)) {
    for (const sub of monthlySubmissions) {
      const key = sub.subjectUserId.toString();
      perMemberMonthly.set(
        key,
        (perMemberMonthly.get(key) ?? 0) + (sub.completionCount ?? 0),
      );
    }
  }

  const monthlyGoals =
    supportsMonthlyGoal(taskType)
      ? ((await MonthlyGoalModel.find({
          taskId: toObjectId(taskId),
          userId: { $in: displayMembers.map((u) => toObjectId(u.id)) },
          yearMonth,
        }).lean()) as MonthlyGoalRecord[])
      : [];
  const goalByUser = new Map(
    monthlyGoals.map((g) => [g.userId.toString(), g.targetCount]),
  );

  const perMemberAllTime = new Map<string, number>();
  if (taskType === "COUNT_TOTAL") {
    const allSubs = (await SubmissionModel.find({
      taskId: toObjectId(taskId),
      subjectUserId: { $in: displayMembers.map((u) => toObjectId(u.id)) },
    }).lean()) as SubmissionRecordModel[];
    for (const sub of allSubs) {
      const key = sub.subjectUserId.toString();
      perMemberAllTime.set(
        key,
        (perMemberAllTime.get(key) ?? 0) + (sub.completionCount ?? 0),
      );
    }
  }

  const roster: RosterEntry[] = displayMembers.map((user) => {
    const todaySub = submissionsToday.find(
      (s) => s.subjectUserId.toString() === user.id,
    );
    const entry: RosterEntry = {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      completionCount: todaySub?.completionCount ?? 0,
    };
    if (supportsMonthlyGoal(taskType)) {
      entry.monthlyCompletion = perMemberMonthly.get(user.id) ?? 0;
      entry.monthlyGoal = goalByUser.get(user.id) ?? null;
    } else {
      entry.contribution = perMemberAllTime.get(user.id) ?? 0;
    }
    return entry;
  });

  const monthlyCompletion =
    supportsMonthlyGoal(taskType)
      ? perMemberMonthly.get(selectedSubject.id) ?? 0
      : 0;
  const monthlyGoal =
    supportsMonthlyGoal(taskType)
      ? goalByUser.get(selectedSubject.id) ?? null
      : null;

  const lateWindowDays = task.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS;
  let backfillDays: BackfillDay[] = [];
  if (supportsMonthlyGoal(taskType)) {
    const pastDateKeys: string[] = [];
    const now = new Date();
    for (let i = 1; i <= lateWindowDays; i++) {
      pastDateKeys.push(
        getTodayDateKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)),
      );
    }
    const backfillSubs =
      pastDateKeys.length > 0
        ? ((await SubmissionModel.find({
            date: { $in: pastDateKeys },
            subjectUserId: toObjectId(selectedSubject.id),
            taskId: toObjectId(taskId),
          }).lean()) as SubmissionRecordModel[])
        : [];
    const backfillCountByDate = new Map(
      backfillSubs.map((s) => [s.date, s.completionCount ?? 0]),
    );
    backfillDays = pastDateKeys.map((d) => ({
      dateKey: d,
      completionCount: backfillCountByDate.get(d) ?? 0,
    }));
  }

  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    date: dateKey,
    yearMonth,
    deadlineAt: createDeadlineAt(dateKey, task.deadlineTime).toISOString(),
    expReward: task.expReward ?? DEFAULT_EXP_REWARD,
    pointReward: task.pointReward ?? DEFAULT_POINT_REWARD,
    lateWindowDays,
    status: computeTaskStatus(task, dateKey),
    taskType,
    targetRoles: normalizeTargetRoles(task.targetRoles),
    targetCount: task.targetCount ?? null,
    totalAcrossAll,
    monthlyGoal,
    monthlyCompletion,
    myCompletionCount: selectedTodaySub?.completionCount ?? 0,
    isApplicableToActor,
    totalCompletions: submissionsToday
      .filter((s) => rosterMemberIds.has(s.subjectUserId.toString()))
      .reduce((sum, s) => sum + (s.completionCount ?? 0), 0),
    selectedSubject,
    rosterMembers,
    roster,
    backfillDays,
  };
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  deadlineTime: string;
  expReward?: number;
  pointReward?: number;
  lateWindowDays?: number;
  isActive?: boolean;
  taskType?: TaskType;
  targetCount?: number | null;
  targetRoles: TaskTargetRole[];
  submissionMessage?: string;
  completionMessage?: string;
};

export async function createTask(
  actor: SessionUser,
  input: CreateTaskInput,
): Promise<string> {
  const actorScope = resolveActorScope(actor);
  const taskType: TaskType = normalizeTaskType(input.taskType);

  if (taskType === "COUNT_TOTAL") {
    if (
      !input.targetCount ||
      !Number.isInteger(input.targetCount) ||
      input.targetCount < 1
    ) {
      throw new Error("Task theo số lần cần mục tiêu (targetCount) ≥ 1.");
    }
  }

  await connectToDatabase();

  const created = await TaskModel.create({
    createdBy: toObjectId(actor.id),
    deadlineTime: input.deadlineTime,
    description: input.description?.trim() ?? "",
    expReward: input.expReward ?? DEFAULT_EXP_REWARD,
    pointReward: input.pointReward ?? DEFAULT_POINT_REWARD,
    lateWindowDays: input.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
    isActive: input.isActive ?? true,
    regionId: actorScope.regionId ? toObjectId(actorScope.regionId) : null,
    scope: actorScope.scope,
    submissionMessage: input.submissionMessage?.trim() ?? "",
    completionMessage: input.completionMessage?.trim() ?? "",
    taskType,
    targetCount: taskType === "COUNT_TOTAL" ? input.targetCount : null,
    targetRoles: normalizeTargetRoles(input.targetRoles),
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
      taskType,
      targetCount: taskType === "COUNT_TOTAL" ? input.targetCount : null,
      targetRoles: normalizeTargetRoles(input.targetRoles),
      teamId: actorScope.teamId,
      title: input.title,
    },
  });

  return created._id.toString();
}

export type UpdateTaskInput = {
  title: string;
  description?: string;
  deadlineTime: string;
  expReward?: number;
  pointReward?: number;
  lateWindowDays?: number;
  targetCount?: number | null;
  targetRoles: TaskTargetRole[];
  submissionMessage?: string;
  completionMessage?: string;
};

export async function updateTask(
  actor: SessionUser,
  taskId: string,
  input: UpdateTaskInput,
): Promise<void> {
  await connectToDatabase();

  const record = (await TaskModel.findById(taskId).lean()) as TaskRecord | null;

  if (!record || !canManageTask(actor, taskToScope(record))) {
    throw new Error("Không tìm thấy nhiệm vụ phù hợp.");
  }

  const taskType = normalizeTaskType(record.taskType);
  let nextTargetCount: number | null = record.targetCount ?? null;
  if (taskType === "COUNT_TOTAL") {
    if (
      !input.targetCount ||
      !Number.isInteger(input.targetCount) ||
      input.targetCount < 1
    ) {
      throw new Error("Task theo số lần cần mục tiêu (targetCount) ≥ 1.");
    }
    nextTargetCount = input.targetCount;
  } else {
    nextTargetCount = null;
  }

  await TaskModel.updateOne(
    { _id: record._id },
    {
      $set: {
        title: input.title,
        description: input.description?.trim() ?? "",
        deadlineTime: input.deadlineTime,
        expReward: input.expReward ?? DEFAULT_EXP_REWARD,
        pointReward: input.pointReward ?? DEFAULT_POINT_REWARD,
        lateWindowDays: input.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
        targetCount: nextTargetCount,
        targetRoles: normalizeTargetRoles(input.targetRoles),
        submissionMessage: input.submissionMessage?.trim() ?? "",
        completionMessage: input.completionMessage?.trim() ?? "",
      },
    },
  );

  await AuditLogModel.create({
    action: "task.updated",
    actorUserId: toObjectId(actor.id),
    entityId: taskId,
    entityType: "Task",
    metadata: {
      title: input.title,
      taskType,
      targetCount: nextTargetCount,
      targetRoles: normalizeTargetRoles(input.targetRoles),
    },
  });
}

export async function deleteTask(
  actor: SessionUser,
  taskId: string,
): Promise<void> {
  await connectToDatabase();

  const record = (await TaskModel.findById(taskId).lean()) as TaskRecord | null;

  if (!record || !canManageTask(actor, taskToScope(record))) {
    throw new Error("Không tìm thấy nhiệm vụ phù hợp.");
  }

  const taskObjectId = toObjectId(taskId);

  await Promise.all([
    SubmissionModel.deleteMany({ taskId: taskObjectId }),
    MonthlyGoalModel.deleteMany({ taskId: taskObjectId }),
    TaskReminderPreferenceModel.deleteMany({ taskId: taskObjectId }),
  ]);

  await TaskModel.deleteOne({ _id: record._id });

  await AuditLogModel.create({
    action: "task.deleted",
    actorUserId: toObjectId(actor.id),
    entityId: taskId,
    entityType: "Task",
    metadata: {
      title: record.title,
      scope: record.scope,
      taskType: record.taskType,
    },
  });
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
  await connectToDatabase();
  const all = (
    actor.role === "ADMIN"
      ? await TaskModel.find({}).sort({ createdAt: -1 }).lean()
      : actor.teamId
        ? await TaskModel.find({
            teamId: toObjectId(actor.teamId),
          })
            .sort({ createdAt: -1 })
            .lean()
        : []
  ) as TaskRecord[];

  if (actor.role === "ADMIN") {
    return all.map(mapTask);
  }

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
