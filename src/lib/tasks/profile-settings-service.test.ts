import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import type {
  MonthlyGoalRecord,
  TaskRecord,
  TaskReminderPreferenceRecord,
} from "@/lib/models";
import { buildProfileTaskSettings } from "@/lib/tasks/profile-settings-service";

const ids = {
  hiddenTask: new Types.ObjectId(),
  team: new Types.ObjectId(),
  task: new Types.ObjectId(),
  user: new Types.ObjectId(),
};

function task(input: Partial<TaskRecord> = {}): TaskRecord {
  return {
    _id: input._id ?? ids.task,
    completedAt: null,
    completionMessage: "",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    createdBy: new Types.ObjectId(),
    deadlineTime: input.deadlineTime ?? "21:00",
    description: "",
    expReward: 10,
    isActive: input.isActive ?? true,
    lateWindowDays: 7,
    pointReward: 10,
    regionId: null,
    scope: "TEAM",
    sortOrder: input.sortOrder ?? null,
    submissionMessage: "",
    targetCount: null,
    targetRoles: ["MEMBER"],
    taskType: input.taskType ?? "DAILY_PER_MEMBER",
    teamId: ids.team,
    title: input.title ?? "Cầu nguyện",
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    zoneId: null,
    campaignOnly: false,
    maxPerWeek: null,
    ...input,
  };
}

function preference(
  input: Partial<TaskReminderPreferenceRecord> = {},
): TaskReminderPreferenceRecord {
  return {
    _id: new Types.ObjectId(),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    enabled: input.enabled ?? true,
    reminderTime: input.reminderTime ?? "18:15",
    taskId: input.taskId ?? ids.task,
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    userId: ids.user,
  };
}

function goal(input: Partial<MonthlyGoalRecord> = {}): MonthlyGoalRecord {
  return {
    _id: new Types.ObjectId(),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    targetCount: input.targetCount ?? 20,
    taskId: input.taskId ?? ids.task,
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    userId: ids.user,
    yearMonth: input.yearMonth ?? "2026-06",
  };
}

describe("profile task settings", () => {
  it("builds user-applicable task settings with reminder and monthly goal data", () => {
    const settings = buildProfileTaskSettings({
      actor: {
        id: ids.user.toString(),
        role: "MEMBER",
        teamId: ids.team.toString(),
        zoneId: null,
        regionId: null,
      },
      goals: [goal()],
      preferences: [preference()],
      tasks: [
        task({ title: "B task", sortOrder: 2 }),
        task({
          _id: ids.hiddenTask,
          title: "Hidden task",
          sortOrder: 1,
        }),
      ],
      visibilityOverrides: new Map([[`${ids.hiddenTask}:${ids.user}`, false]]),
      yearMonth: "2026-06",
    });

    expect(settings).toEqual([
      expect.objectContaining({
        currentGoal: 20,
        defaultReminderTime: "21:00",
        effectiveReminderTime: "18:15",
        initialEnabled: true,
        initialReminderTime: "18:15",
        taskId: ids.task.toString(),
        title: "B task",
        unitLabel: "ngày",
        yearMonth: "2026-06",
      }),
    ]);
  });

  it("keeps reminder-only tasks but omits monthly goal controls for count-total tasks", () => {
    const settings = buildProfileTaskSettings({
      actor: {
        id: ids.user.toString(),
        role: "MEMBER",
        teamId: ids.team.toString(),
        zoneId: null,
        regionId: null,
      },
      goals: [],
      preferences: [],
      tasks: [task({ taskType: "COUNT_TOTAL" })],
      visibilityOverrides: new Map(),
      yearMonth: "2026-06",
    });

    expect(settings).toHaveLength(1);
    expect(settings[0]).toMatchObject({
      currentGoal: null,
      supportsMonthlyGoal: false,
      unitLabel: "lượt",
    });
  });
});
