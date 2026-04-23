import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import type {
  MonthlyGoalRecord,
  ReminderLogRecord,
  SubmissionRecordModel,
  TaskRecord,
} from "@/lib/models";
import {
  buildDueMonthlyGoalReminderCandidatesFromData,
  buildDueTaskReminderCandidatesFromData,
  resolveEffectiveReminderTime,
} from "@/lib/tasks/reminder-service";

const ids = {
  task: new Types.ObjectId(),
  team: new Types.ObjectId(),
  user: new Types.ObjectId(),
};

function task(input: Partial<TaskRecord> = {}): TaskRecord {
  return {
    _id: input._id ?? ids.task,
    completedAt: null,
    completionMessage: "",
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    createdBy: new Types.ObjectId(),
    deadlineTime: input.deadlineTime ?? "21:00",
    description: "",
    expReward: 10,
    isActive: input.isActive ?? true,
    lateWindowDays: 7,
    pointReward: 10,
    regionId: null,
    scope: "TEAM",
    submissionMessage: "",
    targetCount: null,
    targetRoles: ["MEMBER"],
    taskType: input.taskType ?? "MONTHLY_PER_MEMBER",
    teamId: ids.team,
    title: input.title ?? "Daily update",
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    zoneId: null,
    ...input,
  };
}

function user(input: { telegramId?: number | null } = {}) {
  return {
    _id: ids.user,
    regionId: null,
    role: "MEMBER" as const,
    status: "ACTIVE" as const,
    teamId: ids.team,
    telegramId: Object.hasOwn(input, "telegramId") ? input.telegramId : 123456,
    zoneId: null,
  };
}

function preference(input: { enabled?: boolean; reminderTime: string }) {
  return {
    enabled: input.enabled ?? true,
    reminderTime: input.reminderTime,
    taskId: ids.task,
    userId: ids.user,
  };
}

function submission(): SubmissionRecordModel {
  return {
    _id: new Types.ObjectId(),
    actorUserId: ids.user,
    completionCount: 1,
    createdAt: new Date("2026-04-20T08:00:00.000Z"),
    date: "2026-04-20",
    subjectUserId: ids.user,
    submittedAt: new Date("2026-04-20T08:00:00.000Z"),
    taskId: ids.task,
    updatedAt: new Date("2026-04-20T08:00:00.000Z"),
  };
}

function reminderLog(date = "2026-04-20"): ReminderLogRecord {
  return {
    _id: new Types.ObjectId(),
    createdAt: new Date("2026-04-20T08:00:00.000Z"),
    date,
    sentAt: new Date("2026-04-20T08:00:00.000Z"),
    taskId: ids.task,
    updatedAt: new Date("2026-04-20T08:00:00.000Z"),
    userId: ids.user,
  };
}

function monthlyGoal(): MonthlyGoalRecord {
  return {
    _id: new Types.ObjectId(),
    createdAt: new Date("2026-04-03T08:00:00.000Z"),
    targetCount: 10,
    taskId: ids.task,
    updatedAt: new Date("2026-04-03T08:00:00.000Z"),
    userId: ids.user,
    yearMonth: "2026-04",
  };
}

describe("reminder service scheduling", () => {
  it("uses user-specific task time only when it is due", () => {
    const due = buildDueTaskReminderCandidatesFromData({
      dateKey: "2026-04-20",
      preferences: [preference({ reminderTime: "16:00" })],
      sentLogs: [],
      submissions: [],
      sweepAt: new Date("2026-04-20T09:00:00.000Z"),
      tasks: [task()],
      users: [user()],
    });
    const early = buildDueTaskReminderCandidatesFromData({
      dateKey: "2026-04-20",
      preferences: [preference({ reminderTime: "16:00" })],
      sentLogs: [],
      submissions: [],
      sweepAt: new Date("2026-04-20T08:30:00.000Z"),
      tasks: [task()],
      users: [user()],
    });

    expect(due).toHaveLength(1);
    expect(early).toHaveLength(0);
  });

  it("suppresses fallback defaults when a task preference is disabled", () => {
    const reminders = buildDueTaskReminderCandidatesFromData({
      dateKey: "2026-04-20",
      preferences: [preference({ enabled: false, reminderTime: "16:00" })],
      sentLogs: [],
      submissions: [],
      sweepAt: new Date("2026-04-20T13:30:00.000Z"),
      tasks: [task()],
      users: [user()],
    });

    expect(reminders).toHaveLength(0);
  });

  it("uses the task default and caps reminders before the deadline", () => {
    const schedule = resolveEffectiveReminderTime({
      defaultReminderTime: "21:00",
      deadlineTime: "21:00",
      preference: null,
    });
    const reminders = buildDueTaskReminderCandidatesFromData({
      dateKey: "2026-04-20",
      preferences: [],
      sentLogs: [],
      submissions: [],
      sweepAt: new Date("2026-04-20T13:30:00.000Z"),
      tasks: [task()],
      users: [user()],
    });

    expect(schedule).toMatchObject({
      effectiveReminderTime: "20:30",
      isCappedBeforeDeadline: true,
    });
    expect(reminders).toHaveLength(1);
  });

  it("caps personal reminders that are later than the task deadline", () => {
    const schedule = resolveEffectiveReminderTime({
      defaultReminderTime: "21:00",
      deadlineTime: "21:00",
      preference: preference({ reminderTime: "22:30" }),
    });
    const reminders = buildDueTaskReminderCandidatesFromData({
      dateKey: "2026-04-20",
      preferences: [preference({ reminderTime: "22:30" })],
      sentLogs: [],
      submissions: [],
      sweepAt: new Date("2026-04-20T13:30:00.000Z"),
      tasks: [task()],
      users: [user()],
    });

    expect(schedule.effectiveReminderTime).toBe("20:30");
    expect(reminders).toHaveLength(1);
  });

  it("skips submitted users and already logged reminders", () => {
    const submitted = buildDueTaskReminderCandidatesFromData({
      dateKey: "2026-04-20",
      preferences: [preference({ reminderTime: "16:00" })],
      sentLogs: [],
      submissions: [submission()],
      sweepAt: new Date("2026-04-20T09:00:00.000Z"),
      tasks: [task()],
      users: [user()],
    });
    const logged = buildDueTaskReminderCandidatesFromData({
      dateKey: "2026-04-20",
      preferences: [preference({ reminderTime: "16:00" })],
      sentLogs: [reminderLog()],
      submissions: [],
      sweepAt: new Date("2026-04-20T09:00:00.000Z"),
      tasks: [task()],
      users: [user()],
    });

    expect(submitted).toHaveLength(0);
    expect(logged).toHaveLength(0);
  });

  it("uses task preferences for monthly-goal reminders and skips existing goals", () => {
    const due = buildDueMonthlyGoalReminderCandidatesFromData({
      goals: [],
      preferences: [preference({ reminderTime: "16:00" })],
      sentLogs: [],
      sweepAt: new Date("2026-04-03T09:00:00.000Z"),
      tasks: [task({ taskType: "MONTHLY_PER_MEMBER" })],
      users: [user({ telegramId: null })],
      yearMonth: "2026-04",
    });
    const withGoal = buildDueMonthlyGoalReminderCandidatesFromData({
      goals: [monthlyGoal()],
      preferences: [preference({ reminderTime: "16:00" })],
      sentLogs: [],
      sweepAt: new Date("2026-04-03T09:00:00.000Z"),
      tasks: [task({ taskType: "MONTHLY_PER_MEMBER" })],
      users: [user()],
      yearMonth: "2026-04",
    });

    expect(due).toMatchObject([{ chatId: null, taskId: ids.task.toString() }]);
    expect(withGoal).toHaveLength(0);
  });
});
