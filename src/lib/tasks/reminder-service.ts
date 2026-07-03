import { createDeadlineAt, getCurrentYearMonth, getTodayDateKey } from "@/lib/dates";
import type { SerializedUser, SessionUser } from "@/lib/domain";
import { normalizeTargetRoles } from "@/lib/domain";
import { connectToDatabase } from "@/lib/mongoose";
import {
  MonthlyGoalModel,
  type MonthlyGoalRecord,
  ReminderLogModel,
  type ReminderLogRecord,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  TaskReminderPreferenceModel,
  type TaskRecord,
  type TaskReminderPreferenceRecord,
  UserModel,
  type UserRecord,
  UserTaskVisibilityModel,
} from "@/lib/models";
import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
import {
  DEFAULT_LATE_WINDOW_DAYS,
  MONTHLY_GOAL_TASK_TYPES,
} from "@/lib/tasks/constants";
import { appliesToUser, isWithinLateWindow, type ScopeContext } from "@/lib/tasks/policy";
import {
  MONTHLY_GOAL_REMINDER_WINDOW_DAYS,
  REMINDER_SWEEP_WINDOW_MINUTES,
  resolveReminderDisplayTime,
} from "@/lib/tasks/reminder-time";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import { toObjectId } from "@/lib/utils/ids";

type ReminderPreferenceLike = Pick<
  TaskReminderPreferenceRecord,
  "enabled" | "reminderTime" | "taskId" | "userId"
>;

type ReminderUserLike = Pick<
  UserRecord,
  "_id" | "role" | "status" | "teamId" | "telegramId" | "zoneId" | "regionId"
>;

export type ReminderCandidate = {
  chatId: number | null;
  taskId: string;
  userId: string;
  text: string;
};

export type ReminderRecipient = {
  taskId: string;
  userId: string;
};

export type TaskReminderSettings = {
  defaultReminderTime: string;
  effectiveReminderTime: string | null;
  enabled: boolean;
  isCappedBeforeDeadline: boolean;
  reminderTime: string;
  source: "custom" | "default";
};

export function resolveEffectiveReminderTime(input: {
  defaultReminderTime: string;
  deadlineTime: string;
  preference?: Pick<ReminderPreferenceLike, "enabled" | "reminderTime"> | null;
}): TaskReminderSettings {
  const source = input.preference ? "custom" : "default";
  const enabled = input.preference?.enabled ?? true;
  const reminderTime = input.preference?.reminderTime ?? input.defaultReminderTime;
  const displayTime = resolveReminderDisplayTime({
    deadlineTime: input.deadlineTime,
    enabled,
    reminderTime,
  });

  return {
    defaultReminderTime: input.defaultReminderTime,
    effectiveReminderTime: displayTime.effectiveReminderTime,
    enabled,
    isCappedBeforeDeadline: displayTime.isCappedBeforeDeadline,
    reminderTime,
    source,
  };
}

export function isReminderDue(input: {
  dateKey: string;
  reminderTime: string;
  sweepAt: Date;
  windowMinutes?: number;
}): boolean {
  const dueAt = createDeadlineAt(input.dateKey, input.reminderTime).getTime();
  const sweepAt = input.sweepAt.getTime();
  const windowMs =
    (input.windowMinutes ?? REMINDER_SWEEP_WINDOW_MINUTES) * 60 * 1000;
  return dueAt <= sweepAt && dueAt > sweepAt - windowMs;
}

function taskToScope(
  task: Pick<
    TaskRecord,
    "scope" | "teamId" | "zoneId" | "regionId" | "targetRoles" | "isDtt"
  >,
): ScopeContext {
  return {
    regionId: task.regionId?.toString() ?? null,
    scope: task.scope,
    targetRoles: normalizeTargetRoles(task.targetRoles, task.scope),
    teamId: task.teamId.toString(),
    zoneId: task.zoneId?.toString() ?? null,
    isDtt: task.isDtt,
  };
}

function computeTaskStatus(
  task: Pick<TaskRecord, "lateWindowDays" | "completedAt">,
  dateKey: string,
  now: Date,
) {
  if (task.completedAt) return "COMPLETED";
  return isWithinLateWindow(
    dateKey,
    task.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
    now,
  )
    ? "OPEN"
    : "LOCKED";
}

function userShape(
  user: Pick<
    SerializedUser,
    "teamId" | "zoneId" | "regionId" | "role"
  >,
) {
  return {
    regionId: user.regionId ?? null,
    role: user.role,
    teamId: user.teamId ?? null,
    zoneId: user.zoneId ?? null,
  };
}

function recordUserShape(user: ReminderUserLike, dttUserIdsSet?: Set<string>) {
  return {
    regionId: user.regionId?.toString() ?? null,
    role: user.role,
    teamId: user.teamId?.toString() ?? null,
    zoneId: user.zoneId?.toString() ?? null,
    isDttUser: dttUserIdsSet ? dttUserIdsSet.has(user._id.toString()) : false,
  };
}

function isTaskApplicableToReminderUser(input: {
  dttUserIdsSet?: Set<string>;
  scope: ScopeContext;
  taskId: string;
  user: ReminderUserLike;
  visibilityOverrides?: Map<string, boolean>;
}) {
  const userId = input.user._id.toString();
  const override = input.visibilityOverrides?.get(pairKey(input.taskId, userId));
  if (override !== undefined) return override;
  return appliesToUser(input.scope, recordUserShape(input.user, input.dttUserIdsSet));
}

function pairKey(taskId: string, userId: string) {
  return `${taskId}:${userId}`;
}

function preferenceKey(preference: ReminderPreferenceLike) {
  return pairKey(preference.taskId.toString(), preference.userId.toString());
}

function buildPreferenceMap(preferences: ReminderPreferenceLike[]) {
  return new Map(preferences.map((preference) => [preferenceKey(preference), preference]));
}

function buildSentPairs(logs: ReminderLogRecord[]) {
  return new Set(logs.map((log) => pairKey(log.taskId.toString(), log.userId.toString())));
}

export function buildDueTaskReminderCandidatesFromData(input: {
  dateKey: string;
  dttUserIdsSet?: Set<string>;
  preferences: ReminderPreferenceLike[];
  sentLogs: ReminderLogRecord[];
  submissions: SubmissionRecordModel[];
  sweepAt: Date;
  tasks: TaskRecord[];
  users: ReminderUserLike[];
  windowMinutes?: number;
  visibilityOverrides?: Map<string, boolean>;
}): ReminderCandidate[] {
  const openTasks = input.tasks.filter(
    (task) =>
      task.isActive &&
      isTaskScheduledForDate(task, input.dateKey) &&
      computeTaskStatus(task, input.dateKey, input.sweepAt) === "OPEN",
  );
  const preferenceByPair = buildPreferenceMap(input.preferences);
  const sentPairs = buildSentPairs(input.sentLogs);
  const reminders: ReminderCandidate[] = [];

  for (const task of openTasks) {
    const scope = taskToScope(task);
    const taskId = task._id.toString();
    const submittedIds = new Set(
      input.submissions
        .filter((submission) => submission.taskId.toString() === taskId)
        .map((submission) => submission.subjectUserId.toString()),
    );

    for (const user of input.users) {
      if (user.status !== "ACTIVE") continue;
      const userId = user._id.toString();
      const key = pairKey(taskId, userId);
      if (sentPairs.has(key)) continue;
      if (submittedIds.has(userId)) continue;
      const override = input.visibilityOverrides?.get(key);
      const isApplicable = override !== undefined ? override : appliesToUser(scope, recordUserShape(user, input.dttUserIdsSet));
      if (!isApplicable) continue;

      const schedule = resolveEffectiveReminderTime({
        defaultReminderTime: task.deadlineTime,
        deadlineTime: task.deadlineTime,
        preference: preferenceByPair.get(key) ?? null,
      });
      if (!schedule.effectiveReminderTime) continue;
      if (
        !isReminderDue({
          dateKey: input.dateKey,
          reminderTime: schedule.effectiveReminderTime,
          sweepAt: input.sweepAt,
          windowMinutes: input.windowMinutes,
        })
      ) {
        continue;
      }

      reminders.push({
        chatId: user.telegramId ?? null,
        taskId,
        userId,
        text: `Nhắc nhở: bạn chưa cập nhật nhiệm vụ "${task.title}" cho ngày ${input.dateKey}. Mở WebApp để điền ngay.`,
      });
    }
  }

  return reminders;
}

export function buildDueMonthlyGoalReminderCandidatesFromData(input: {
  dttUserIdsSet?: Set<string>;
  goals: MonthlyGoalRecord[];
  preferences: ReminderPreferenceLike[];
  sentLogs: ReminderLogRecord[];
  sweepAt: Date;
  tasks: TaskRecord[];
  users: ReminderUserLike[];
  visibilityOverrides?: Map<string, boolean>;
  windowMinutes?: number;
  yearMonth: string;
}): ReminderCandidate[] {
  const dateKey = getTodayDateKey(input.sweepAt);
  const dayOfMonth = Number.parseInt(dateKey.slice(8, 10), 10);
  if (dayOfMonth > MONTHLY_GOAL_REMINDER_WINDOW_DAYS) return [];

  const preferenceByPair = buildPreferenceMap(input.preferences);
  const sentPairs = buildSentPairs(input.sentLogs);
  const goalPairs = new Set(
    input.goals.map((goal) => pairKey(goal.taskId.toString(), goal.userId.toString())),
  );
  const reminders: ReminderCandidate[] = [];
  const tasks = input.tasks.filter(
    (task) =>
      task.isActive &&
      (MONTHLY_GOAL_TASK_TYPES as readonly string[]).includes(task.taskType),
  );

  for (const task of tasks) {
    const scope = taskToScope(task);
    const taskId = task._id.toString();

    for (const user of input.users) {
      if (user.status !== "ACTIVE") continue;
      const userId = user._id.toString();
      const key = pairKey(taskId, userId);
      if (sentPairs.has(key)) continue;
      if (goalPairs.has(key)) continue;
      if (
        !isTaskApplicableToReminderUser({
          dttUserIdsSet: input.dttUserIdsSet,
          scope,
          taskId,
          user,
          visibilityOverrides: input.visibilityOverrides,
        })
      ) {
        continue;
      }

      const schedule = resolveEffectiveReminderTime({
        defaultReminderTime: task.deadlineTime,
        deadlineTime: task.deadlineTime,
        preference: preferenceByPair.get(key) ?? null,
      });
      if (!schedule.effectiveReminderTime) continue;
      if (
        !isReminderDue({
          dateKey,
          reminderTime: schedule.effectiveReminderTime,
          sweepAt: input.sweepAt,
          windowMinutes: input.windowMinutes,
        })
      ) {
        continue;
      }

      reminders.push({
        chatId: user.telegramId ?? null,
        taskId,
        userId,
        text: `Nhắc nhở: bạn chưa đặt mục tiêu tháng ${input.yearMonth} cho nhiệm vụ "${task.title}". Mở WebApp để cập nhật.`,
      });
    }
  }

  return reminders;
}

async function getPreferences(taskIds: unknown[], userIds: unknown[]) {
  if (taskIds.length === 0 || userIds.length === 0) {
    return [] as TaskReminderPreferenceRecord[];
  }
  return (await TaskReminderPreferenceModel.find({
    taskId: { $in: taskIds },
    userId: { $in: userIds },
  }).lean()) as TaskReminderPreferenceRecord[];
}

export async function getTaskReminderSettings(
  actor: SessionUser,
  taskId: string,
): Promise<TaskReminderSettings | null> {
  await connectToDatabase();
  const task = (await TaskModel.findById(taskId).lean()) as TaskRecord | null;
  if (!task) throw new Error("Nhiệm vụ không còn tồn tại.");
  if (!appliesToUser(taskToScope(task), userShape(actor))) return null;

  const preference = (await TaskReminderPreferenceModel.findOne({
    taskId: toObjectId(taskId),
    userId: toObjectId(actor.id),
  }).lean()) as TaskReminderPreferenceRecord | null;

  return resolveEffectiveReminderTime({
    defaultReminderTime: task.deadlineTime,
    deadlineTime: task.deadlineTime,
    preference,
  });
}

export async function setTaskReminderPreference(
  actor: SessionUser,
  input: { enabled: boolean; reminderTime: string; taskId: string },
): Promise<void> {
  await connectToDatabase();
  const task = (await TaskModel.findById(input.taskId).lean()) as TaskRecord | null;
  if (!task) throw new Error("Nhiệm vụ không còn tồn tại.");
  const override = await UserTaskVisibilityModel.findOne({
    taskId: toObjectId(input.taskId),
    userId: toObjectId(actor.id),
  }).lean();
  const isApplicable = override !== null
    ? override.isVisible
    : appliesToUser(taskToScope(task), userShape(actor));
  if (!isApplicable) {
    throw new Error("Bạn không có quyền đặt nhắc cho nhiệm vụ này.");
  }

  await TaskReminderPreferenceModel.updateOne(
    {
      taskId: toObjectId(input.taskId),
      userId: toObjectId(actor.id),
    },
    {
      $set: {
        enabled: input.enabled,
        reminderTime: input.reminderTime,
      },
      $setOnInsert: {
        taskId: toObjectId(input.taskId),
        userId: toObjectId(actor.id),
      },
    },
    { upsert: true },
  );
}

export async function getReminderCandidates(
  dateKey: string,
  options: { sweepAt?: Date; windowMinutes?: number } = {},
): Promise<ReminderCandidate[]> {
  await connectToDatabase();

  const sweepAt = options.sweepAt ?? new Date();
  const tasks = (await TaskModel.find({ isActive: true }).lean()) as TaskRecord[];
  if (tasks.length === 0) return [];

  const taskIds = tasks.map((task) => task._id);
  const openTasks = tasks.filter(
    (task) => computeTaskStatus(task, dateKey, sweepAt) === "OPEN",
  );
  if (openTasks.length === 0) return [];

  const users = (await UserModel.find({
    status: "ACTIVE",
  }).lean()) as UserRecord[];
  if (users.length === 0) return [];

  const userIds = users.map((user) => user._id);
  const [sentLogs, submissions, preferences, dttEnrollments] = await Promise.all([
    ReminderLogModel.find({
      date: dateKey,
      taskId: { $in: openTasks.map((task) => task._id) },
    }).lean() as Promise<ReminderLogRecord[]>,
    SubmissionModel.find({
      date: dateKey,
      taskId: { $in: openTasks.map((task) => task._id) },
    }).lean() as Promise<SubmissionRecordModel[]>,
    getPreferences(taskIds, userIds),
    DttEnrollmentModel.find({ userId: { $in: userIds } }).lean(),
  ]);
  const dttUserIdsSet = new Set(dttEnrollments.map((e) => e.userId.toString()));

  const visibilities = await UserTaskVisibilityModel.find({
    userId: { $in: userIds },
    taskId: { $in: taskIds },
  }).lean();
  const visibilityOverrides = new Map<string, boolean>(
    visibilities.map((v) => [`${v.taskId.toString()}:${v.userId.toString()}`, v.isVisible])
  );

  return buildDueTaskReminderCandidatesFromData({
    dateKey,
    dttUserIdsSet,
    preferences,
    sentLogs,
    submissions,
    sweepAt,
    tasks,
    users,
    windowMinutes: options.windowMinutes,
    visibilityOverrides,
  });
}

export async function markReminderSent(
  dateKey: string,
  recipients: ReminderRecipient[],
): Promise<void> {
  if (recipients.length === 0) return;
  await connectToDatabase();
  await ReminderLogModel.bulkWrite(
    recipients.map(({ taskId, userId }) => ({
      updateOne: {
        filter: {
          date: dateKey,
          taskId: toObjectId(taskId),
          userId: toObjectId(userId),
        },
        update: {
          $setOnInsert: {
            date: dateKey,
            sentAt: new Date(),
            taskId: toObjectId(taskId),
            userId: toObjectId(userId),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

export async function getMonthlyGoalReminderCandidates(
  yearMonth: string,
  options: { sweepAt?: Date; windowMinutes?: number } = {},
): Promise<ReminderCandidate[]> {
  await connectToDatabase();

  const sweepAt = options.sweepAt ?? new Date();
  const tasks = (await TaskModel.find({
    isActive: true,
    taskType: { $in: MONTHLY_GOAL_TASK_TYPES },
  }).lean()) as TaskRecord[];
  if (tasks.length === 0) return [];

  const users = (await UserModel.find({
    status: "ACTIVE",
  }).lean()) as UserRecord[];
  if (users.length === 0) return [];

  const taskIds = tasks.map((task) => task._id);
  const userIds = users.map((user) => user._id);
  const [sentLogs, goals, preferences, dttEnrollments, visibilities] = await Promise.all([
    ReminderLogModel.find({
      date: yearMonth,
      taskId: { $in: taskIds },
    }).lean() as Promise<ReminderLogRecord[]>,
    MonthlyGoalModel.find({
      taskId: { $in: taskIds },
      yearMonth,
    }).lean() as Promise<MonthlyGoalRecord[]>,
    getPreferences(taskIds, userIds),
    DttEnrollmentModel.find({ userId: { $in: userIds } }).lean(),
    UserTaskVisibilityModel.find({
      userId: { $in: userIds },
      taskId: { $in: taskIds },
    }).lean(),
  ]);
  const dttUserIdsSet = new Set(dttEnrollments.map((e) => e.userId.toString()));
  const visibilityOverrides = new Map<string, boolean>(
    visibilities.map((v) => [`${v.taskId.toString()}:${v.userId.toString()}`, v.isVisible])
  );

  return buildDueMonthlyGoalReminderCandidatesFromData({
    dttUserIdsSet,
    goals,
    preferences,
    sentLogs,
    sweepAt,
    tasks,
    users,
    visibilityOverrides,
    windowMinutes: options.windowMinutes,
    yearMonth,
  });
}

export async function getDueMonthlyGoalReminderCandidates(
  options: { sweepAt?: Date; windowMinutes?: number } = {},
): Promise<ReminderCandidate[]> {
  const sweepAt = options.sweepAt ?? new Date();
  return getMonthlyGoalReminderCandidates(getCurrentYearMonth(sweepAt), {
    sweepAt,
    windowMinutes: options.windowMinutes,
  });
}

export async function markMonthlyGoalReminderSent(
  yearMonth: string,
  recipients: ReminderRecipient[],
): Promise<void> {
  await markReminderSent(yearMonth, recipients);
}
