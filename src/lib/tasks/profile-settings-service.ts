import "server-only";

import type { SessionUser } from "@/lib/domain";
import { getCurrentYearMonth } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  MonthlyGoalModel,
  type MonthlyGoalRecord,
  TaskModel,
  TaskReminderPreferenceModel,
  type TaskRecord,
  type TaskReminderPreferenceRecord,
  UserTaskVisibilityModel,
} from "@/lib/models";
import {
  isDailyTaskType,
  isWeeklyTaskType,
  supportsMonthlyGoal,
  type TaskType,
} from "@/lib/tasks/constants";
import { appliesToUser } from "@/lib/tasks/policy";
import { resolveEffectiveReminderTime } from "@/lib/tasks/reminder-service";
import { sortTasksForDisplay, taskToScope } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";

export type ProfileTaskSetting = {
  currentGoal: number | null;
  defaultReminderTime: string;
  effectiveReminderTime: string | null;
  initialEnabled: boolean;
  initialReminderTime: string;
  isCappedBeforeDeadline: boolean;
  supportsMonthlyGoal: boolean;
  taskId: string;
  taskType: TaskType;
  title: string;
  unitLabel: "ngày" | "lượt";
  yearMonth: string;
};

type ProfileActor = Pick<
  SessionUser,
  "id" | "regionId" | "role" | "teamId" | "zoneId"
>;

function actorShape(actor: ProfileActor) {
  return {
    regionId: actor.regionId ?? null,
    role: actor.role,
    teamId: actor.teamId ?? null,
    zoneId: actor.zoneId ?? null,
  };
}

function profilePairKey(taskId: unknown, userId: unknown) {
  return `${String(taskId)}:${String(userId)}`;
}

function taskScopeClauses(actor: ProfileActor): Record<string, unknown>[] {
  const clauses: Record<string, unknown>[] = [];
  if (actor.teamId) {
    clauses.push({ scope: "TEAM", teamId: toObjectId(actor.teamId) });
  }
  if (actor.zoneId) {
    clauses.push({ scope: "ZONE", zoneId: toObjectId(actor.zoneId) });
  }
  if (actor.regionId) {
    clauses.push({ scope: "REGION", regionId: toObjectId(actor.regionId) });
  }
  return clauses;
}

export function buildProfileTaskSettings(input: {
  actor: ProfileActor;
  goals: MonthlyGoalRecord[];
  preferences: TaskReminderPreferenceRecord[];
  tasks: TaskRecord[];
  visibilityOverrides: Map<string, boolean>;
  yearMonth: string;
}): ProfileTaskSetting[] {
  const preferenceByTask = new Map(
    input.preferences.map((preference) => [
      preference.taskId.toString(),
      preference,
    ]),
  );
  const goalByTask = new Map(
    input.goals.map((goal) => [goal.taskId.toString(), goal]),
  );

  return sortTasksForDisplay(input.tasks)
    .filter((task) => {
      const taskId = task._id.toString();
      const override = input.visibilityOverrides.get(
        profilePairKey(taskId, input.actor.id),
      );
      if (override !== undefined) return override;
      return appliesToUser(taskToScope(task), actorShape(input.actor));
    })
    .map((task) => {
      const taskId = task._id.toString();
      const preference = preferenceByTask.get(taskId) ?? null;
      const reminder = resolveEffectiveReminderTime({
        defaultReminderTime: task.deadlineTime,
        deadlineTime: task.deadlineTime,
        preference,
      });
      const canSetGoal =
        supportsMonthlyGoal(task.taskType) &&
        !(isWeeklyTaskType(task.taskType) && task.maxPerWeek !== null);

      return {
        currentGoal: canSetGoal
          ? (goalByTask.get(taskId)?.targetCount ?? null)
          : null,
        defaultReminderTime: reminder.defaultReminderTime,
        effectiveReminderTime: reminder.effectiveReminderTime,
        initialEnabled: reminder.enabled,
        initialReminderTime: reminder.reminderTime,
        isCappedBeforeDeadline: reminder.isCappedBeforeDeadline,
        supportsMonthlyGoal: canSetGoal,
        taskId,
        taskType: task.taskType,
        title: task.title,
        unitLabel: isDailyTaskType(task.taskType) ? "ngày" : "lượt",
        yearMonth: input.yearMonth,
      };
    });
}

export async function listProfileTaskSettings(
  actor: SessionUser,
  yearMonth = getCurrentYearMonth(),
): Promise<ProfileTaskSetting[]> {
  const clauses = taskScopeClauses(actor);
  if (clauses.length === 0) return [];

  await connectToDatabase();

  const tasks = (await TaskModel.find({
    isActive: true,
    $or: clauses,
  }).lean()) as TaskRecord[];
  if (tasks.length === 0) return [];

  const taskIds = tasks.map((task) => task._id);
  const userId = toObjectId(actor.id);
  const [preferences, goals, visibilities] = await Promise.all([
    TaskReminderPreferenceModel.find({
      taskId: { $in: taskIds },
      userId,
    }).lean() as Promise<TaskReminderPreferenceRecord[]>,
    MonthlyGoalModel.find({
      taskId: { $in: taskIds },
      userId,
      yearMonth,
    }).lean() as Promise<MonthlyGoalRecord[]>,
    UserTaskVisibilityModel.find({
      taskId: { $in: taskIds },
      userId,
    }).lean(),
  ]);
  const visibilityOverrides = new Map<string, boolean>(
    visibilities.map((visibility) => [
      profilePairKey(visibility.taskId, visibility.userId),
      visibility.isVisible,
    ]),
  );

  return buildProfileTaskSettings({
    actor,
    goals,
    preferences,
    tasks,
    visibilityOverrides,
    yearMonth,
  });
}
