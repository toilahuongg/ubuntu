import "server-only";

import {
  filterTaskTargetRolesForScope,
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
  UserTaskVisibilityModel,
} from "@/lib/models";
import {
  listTeamMembersForViewing,
  listVisibleUsersForActor,
} from "@/lib/services/organization-service";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_LATE_WINDOW_DAYS,
  DEFAULT_POINT_REWARD,
  getMonthlyGoalLimitForTaskType,
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
import {
  isTaskScheduledForDate,
  normalizeTaskSchedule,
  type TaskScheduleType,
} from "@/lib/tasks/schedule";
import type {
  BackfillDay,
  RosterEntry,
  TaskDetail,
  TaskMoveDirection,
  TaskStatus,
  TaskSummary,
} from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";

export function taskToScope(
  task: Pick<
    TaskRecord,
    "scope" | "teamId" | "zoneId" | "regionId" | "targetRoles" | "isDtt"
  >,
): ScopeContext {
  return {
    scope: task.scope,
    teamId: task.teamId.toString(),
    zoneId: task.zoneId?.toString() ?? null,
    regionId: task.regionId?.toString() ?? null,
    targetRoles: normalizeTargetRoles(task.targetRoles, task.scope),
    isDtt: task.isDtt,
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

type DisplaySortableTask = Pick<
  TaskRecord,
  "_id" | "title" | "deadlineTime" | "createdAt" | "sortOrder"
>;

function getSortOrderValue(sortOrder: number | null | undefined): number {
  return typeof sortOrder === "number" && Number.isFinite(sortOrder)
    ? sortOrder
    : Number.MAX_SAFE_INTEGER;
}

export function compareTaskDisplayOrder(
  a: DisplaySortableTask,
  b: DisplaySortableTask,
): number {
  const sortOrderDiff =
    getSortOrderValue(a.sortOrder) - getSortOrderValue(b.sortOrder);
  if (sortOrderDiff !== 0) return sortOrderDiff;

  const deadlineDiff = a.deadlineTime.localeCompare(b.deadlineTime);
  if (deadlineDiff !== 0) return deadlineDiff;

  const createdAtDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (createdAtDiff !== 0) return createdAtDiff;

  const titleDiff = a.title.localeCompare(b.title, "vi");
  if (titleDiff !== 0) return titleDiff;

  return a._id.toString().localeCompare(b._id.toString());
}

export function sortTasksForDisplay<T extends DisplaySortableTask>(
  tasks: readonly T[],
): T[] {
  return [...tasks].sort(compareTaskDisplayOrder);
}

export function mapTask(record: TaskRecord): TaskSummary {
  const schedule = normalizeTaskSchedule(record);
  const external = normalizeTaskExternalLink(record);
  return {
    id: record._id.toString(),
    title: record.title,
    description: record.description,
    externalLabel: external.label,
    externalUrl: external.url,
    deadlineTime: record.deadlineTime,
    expReward: record.expReward ?? DEFAULT_EXP_REWARD,
    pointReward: record.pointReward ?? DEFAULT_POINT_REWARD,
    lateWindowDays: record.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
    sortOrder: record.sortOrder ?? null,
    scope: record.scope,
    taskType: normalizeTaskType(record.taskType),
    scheduleType: schedule.scheduleType,
    scheduledWeekdays: schedule.scheduledWeekdays,
    scheduledMonthDays: schedule.scheduledMonthDays,
    targetCount: record.targetCount ?? null,
    targetRoles: normalizeTargetRoles(record.targetRoles, record.scope),
    submissionMessage: record.submissionMessage ?? "",
    completionMessage: record.completionMessage ?? "",
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    isActive: record.isActive,
    isDtt: !!record.isDtt,
    campaignOnly: !!record.campaignOnly,
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
  const goalLimit = getMonthlyGoalLimitForTaskType(task.taskType);
  if (goalLimit !== null && targetCount > goalLimit) {
    throw new Error("Nhiệm vụ tháng chỉ được đặt mục tiêu 1 lần.");
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
  const isScheduledForDate = isTaskScheduledForDate(task, dateKey);
  const yearMonth = getYearMonthFromDateKey(dateKey);
  const scope = taskToScope(task);
  const [visibleUsers, viewableUsers, submissionsToday, monthlySubmissions] =
    await Promise.all([
      listVisibleUsersForActor(actor),
      actor.role === "MEMBER" || actor.role === "NGV" || actor.role === "TDM"
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

  const visibilities = await UserTaskVisibilityModel.find({
    taskId: toObjectId(taskId),
    userId: { $in: [...new Set([...visibleUsers, ...viewableUsers, actor].map((u) => toObjectId(u.id)))] },
  }).lean();
  const overridesMap = new Map<string, boolean>(
    visibilities.map((v) => [v.userId.toString(), v.isVisible])
  );

  const checkVisible = (u: SessionUser | SerializedUser) => {
    const override = overridesMap.get(u.id);
    if (override !== undefined) return override;
    return appliesToUser(scope, userShape(u));
  };

  const isApplicableToActor = checkVisible(actor);

  const rosterMembers = visibleUsers.filter(checkVisible);
  const displayMembers = viewableUsers.filter(checkVisible);

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
      const pastDateKey = getTodayDateKey(
        new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
      );
      if (isTaskScheduledForDate(task, pastDateKey)) {
        pastDateKeys.push(pastDateKey);
      }
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

  const external = normalizeTaskExternalLink(task);

  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    externalLabel: external.label,
    externalUrl: external.url,
    date: dateKey,
    yearMonth,
    deadlineAt: createDeadlineAt(dateKey, task.deadlineTime).toISOString(),
    expReward: task.expReward ?? DEFAULT_EXP_REWARD,
    pointReward: task.pointReward ?? DEFAULT_POINT_REWARD,
    lateWindowDays,
    status: isScheduledForDate ? computeTaskStatus(task, dateKey) : "LOCKED",
    taskType,
    targetRoles: normalizeTargetRoles(task.targetRoles, task.scope),
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
  externalLabel?: string;
  externalUrl?: string;
  deadlineTime: string;
  expReward?: number;
  pointReward?: number;
  lateWindowDays?: number;
  isActive?: boolean;
  taskType?: TaskType;
  scheduleType?: TaskScheduleType;
  scheduledWeekdays?: number[];
  scheduledMonthDays?: number[];
  targetCount?: number | null;
  targetRoles: TaskTargetRole[];
  submissionMessage?: string;
  completionMessage?: string;
  campaignOnly?: boolean;
};

export function createCampaignOnlyTaskInput(
  input: Omit<
    CreateTaskInput,
    | "campaignOnly"
    | "taskType"
    | "scheduleType"
    | "scheduledWeekdays"
    | "scheduledMonthDays"
    | "targetCount"
  >,
): CreateTaskInput {
  return {
    ...input,
    campaignOnly: true,
    taskType: "DAILY_PER_MEMBER",
    scheduleType: "EVERY_DAY",
    scheduledWeekdays: [],
    scheduledMonthDays: [],
    targetCount: null,
  };
}

const TASK_SORT_ORDER_STEP = 100;

async function listVisibleTaskRecordsForActor(
  actor: SessionUser,
): Promise<TaskRecord[]> {
  await connectToDatabase();

  const all = (
    actor.role === "ADMIN"
      ? await TaskModel.find({ campaignOnly: { $ne: true } }).lean()
      : actor.teamId
        ? await TaskModel.find({
            campaignOnly: { $ne: true },
            teamId: toObjectId(actor.teamId),
          }).lean()
        : []
  ) as TaskRecord[];

  if (actor.role === "ADMIN") {
    return sortTasksForDisplay(all);
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

  return sortTasksForDisplay(filtered);
}

export function filterManageableTasksForActor(
  actor: SessionUser,
  tasks: readonly TaskRecord[],
): TaskRecord[] {
  return tasks.filter((task) => canManageTask(actor, taskToScope(task)));
}

async function listManageableTaskRecordsForActor(
  actor: SessionUser,
): Promise<TaskRecord[]> {
  const visibleTasks = await listVisibleTaskRecordsForActor(actor);
  return filterManageableTasksForActor(actor, visibleTasks);
}

export async function createTask(
  actor: SessionUser,
  input: CreateTaskInput,
): Promise<string> {
  const actorScope = resolveActorScope(actor);
  const targetRoles = filterTaskTargetRolesForScope(
    input.targetRoles,
    actorScope.scope,
  );
  if (targetRoles.length === 0) {
    throw new Error(
      "Vui lòng chọn ít nhất một vai trò phù hợp với phạm vi nhiệm vụ.",
    );
  }
  const campaignOnly = !!input.campaignOnly;
  if (campaignOnly && actor.role !== "TEAM_LEAD") {
    throw new Error("Chỉ CS - ĐL được tạo nhiệm vụ chiến dịch.");
  }
  if (campaignOnly && actorScope.scope !== "TEAM") {
    throw new Error("Nhiệm vụ chiến dịch chỉ áp dụng trong toàn Nhóm.");
  }
  const taskType: TaskType = campaignOnly
    ? "DAILY_PER_MEMBER"
    : normalizeTaskType(input.taskType);
  const external = normalizeTaskExternalLink(input);
  const schedule = normalizeTaskSchedule({
    scheduleType: campaignOnly ? "EVERY_DAY" : input.scheduleType,
    scheduledMonthDays: campaignOnly ? [] : input.scheduledMonthDays,
    scheduledWeekdays: campaignOnly ? [] : input.scheduledWeekdays,
    taskType,
  });

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
  const manageableTasks = await listManageableTaskRecordsForActor(actor);
  const maxSortOrder = manageableTasks.reduce(
    (max, task, index) =>
      Math.max(
        max,
        task.sortOrder ?? (index + 1) * TASK_SORT_ORDER_STEP,
      ),
    0,
  );

  const created = await TaskModel.create({
    createdBy: toObjectId(actor.id),
    deadlineTime: input.deadlineTime,
    description: input.description?.trim() ?? "",
    externalLabel: external.label,
    externalUrl: external.url,
    expReward: input.expReward ?? DEFAULT_EXP_REWARD,
    pointReward: input.pointReward ?? DEFAULT_POINT_REWARD,
    lateWindowDays: input.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
    isActive: input.isActive ?? true,
    regionId: actorScope.regionId ? toObjectId(actorScope.regionId) : null,
    scope: actorScope.scope,
    scheduleType: schedule.scheduleType,
    scheduledWeekdays: schedule.scheduledWeekdays,
    scheduledMonthDays: schedule.scheduledMonthDays,
    submissionMessage: input.submissionMessage?.trim() ?? "",
    completionMessage: input.completionMessage?.trim() ?? "",
    campaignOnly,
    taskType,
    targetCount: taskType === "COUNT_TOTAL" ? input.targetCount : null,
    targetRoles,
    sortOrder: maxSortOrder + TASK_SORT_ORDER_STEP,
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
      scheduleType: schedule.scheduleType,
      scheduledMonthDays: schedule.scheduledMonthDays,
      scheduledWeekdays: schedule.scheduledWeekdays,
      taskType,
      targetCount: taskType === "COUNT_TOTAL" ? input.targetCount : null,
      targetRoles,
      teamId: actorScope.teamId,
      title: input.title,
      externalLabel: external.label,
      externalUrl: external.url,
    },
  });

  return created._id.toString();
}

export type UpdateTaskInput = {
  title: string;
  description?: string;
  externalLabel?: string;
  externalUrl?: string;
  deadlineTime: string;
  expReward?: number;
  pointReward?: number;
  lateWindowDays?: number;
  taskType?: TaskType;
  scheduleType?: TaskScheduleType;
  scheduledWeekdays?: number[];
  scheduledMonthDays?: number[];
  targetCount?: number | null;
  targetRoles: TaskTargetRole[];
  submissionMessage?: string;
  completionMessage?: string;
  campaignOnly?: boolean;
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

  if (!!input.campaignOnly !== !!record.campaignOnly) {
    throw new Error("Không thể đổi loại nhiệm vụ chiến dịch.");
  }

  const taskType = normalizeTaskType(record.taskType);
  const external = normalizeTaskExternalLink(input);
  const targetRoles = filterTaskTargetRolesForScope(
    input.targetRoles,
    record.scope,
  );
  if (targetRoles.length === 0) {
    throw new Error(
      "Vui lòng chọn ít nhất một vai trò phù hợp với phạm vi nhiệm vụ.",
    );
  }
  const schedule = normalizeTaskSchedule({
    scheduleType: input.scheduleType,
    scheduledMonthDays: input.scheduledMonthDays,
    scheduledWeekdays: input.scheduledWeekdays,
    taskType,
  });
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
        externalLabel: external.label,
        externalUrl: external.url,
        deadlineTime: input.deadlineTime,
        expReward: input.expReward ?? DEFAULT_EXP_REWARD,
        pointReward: input.pointReward ?? DEFAULT_POINT_REWARD,
        lateWindowDays: input.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
        scheduleType: schedule.scheduleType,
        scheduledWeekdays: schedule.scheduledWeekdays,
        scheduledMonthDays: schedule.scheduledMonthDays,
        targetCount: nextTargetCount,
        targetRoles,
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
      scheduleType: schedule.scheduleType,
      scheduledMonthDays: schedule.scheduledMonthDays,
      scheduledWeekdays: schedule.scheduledWeekdays,
      targetCount: nextTargetCount,
      targetRoles,
      externalLabel: external.label,
      externalUrl: external.url,
    },
  });
}

export function normalizeTaskExternalLink(input: {
  externalLabel?: string | null;
  externalUrl?: string | null;
}): { label: string; url: string } {
  const url = input.externalUrl?.trim() ?? "";
  const label = input.externalLabel?.trim() ?? "";

  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Unsupported protocol");
      }
    } catch {
      throw new Error("Liên kết phải bắt đầu bằng http:// hoặc https://.");
    }
  }

  return {
    label: url ? label.slice(0, 40) || "Mở liên kết" : "",
    url,
  };
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

export async function moveTask(
  actor: SessionUser,
  taskId: string,
  direction: TaskMoveDirection,
): Promise<void> {
  await connectToDatabase();

  const record = (await TaskModel.findById(taskId).lean()) as TaskRecord | null;

  if (!record || !canManageTask(actor, taskToScope(record))) {
    throw new Error("Không tìm thấy nhiệm vụ phù hợp.");
  }

  const manageableTasks = await listManageableTaskRecordsForActor(actor);
  const currentIndex = manageableTasks.findIndex((task) => task._id.toString() === taskId);

  if (currentIndex === -1) {
    throw new Error("Không tìm thấy nhiệm vụ trong danh sách sắp xếp.");
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= manageableTasks.length) {
    return;
  }

  const reordered = [...manageableTasks];
  const currentTask = reordered[currentIndex];
  if (!currentTask) {
    return;
  }
  reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, currentTask);

  await TaskModel.bulkWrite(
    reordered.map((task, index) => ({
      updateOne: {
        filter: { _id: task._id },
        update: {
          $set: {
            sortOrder: (index + 1) * TASK_SORT_ORDER_STEP,
          },
        },
      },
    })),
    { ordered: false },
  );

  await AuditLogModel.create({
    action: "task.reordered",
    actorUserId: toObjectId(actor.id),
    entityId: taskId,
    entityType: "Task",
    metadata: {
      direction,
      fromIndex: currentIndex,
      toIndex: targetIndex,
    },
  });
}

export async function listTasksForActor(
  actor: SessionUser,
): Promise<TaskSummary[]> {
  const tasks = await listManageableTaskRecordsForActor(actor);
  return tasks.map(mapTask);
}
