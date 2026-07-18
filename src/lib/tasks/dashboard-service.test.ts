import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import type { TaskRecord } from "@/lib/models";
import type { SerializedUser } from "@/lib/domain";
import {
  buildDashboardGoalNotice,
  buildDashboardSubmissionDateFilter,
  buildTaskCard,
  buildTaskProgress,
  isTaskRelevantForVisibleUsers,
} from "@/lib/tasks/dashboard-service";
import {
  countDashboardDoneCards,
  isDashboardCardDone,
} from "@/lib/tasks/dashboard-card-state";
import { sortTasksForDisplay } from "@/lib/tasks/task-service";
import type { TaskCard, TaskProgress } from "@/lib/tasks/types";
import { getTaskProgressPeriodLabel } from "@/app/(app)/dashboard/task-progress-badge";

function makeCard(
  id: string,
  title: string,
  progress: TaskProgress,
): TaskCard {
  return {
    id,
    title,
    description: "",
    date: "2026-04-20",
    deadlineAt: "2026-04-20T14:00:00.000Z",
    notificationTime: "21:00",
    expReward: 10,
    pointReward: 10,
    status: "OPEN",
    completionCount: 0,
    totalCount: 1,
    myCompletionCount: 0,
    taskType:
      progress.kind === "DAILY_MEMBER"
        ? "DAILY_PER_MEMBER"
        : progress.kind === "WEEKLY_MEMBER"
          ? "WEEKLY_PER_MEMBER"
        : progress.kind === "MONTHLY_MEMBER"
          ? "MONTHLY_PER_MEMBER"
          : "COUNT_TOTAL",
    isApplicableToActor: true,
    progress,
    weeklyCompletion: 0,
    maxPerWeek: null,
  };
}

function makeTask(
  input: Partial<TaskRecord> & Pick<TaskRecord, "_id" | "title" | "deadlineTime">,
): TaskRecord {
  return {
    _id: input._id,
    completedAt: null,
    completionMessage: "",
    createdAt: input.createdAt ?? new Date("2026-04-01T00:00:00.000Z"),
    createdBy: new Types.ObjectId(),
    deadlineTime: input.deadlineTime,
    description: "",
    expReward: 10,
    isActive: true,
    lateWindowDays: 7,
    pointReward: 10,
    regionId: null,
    scope: "TEAM",
    sortOrder: input.sortOrder ?? null,
    submissionMessage: "",
    targetCount: null,
    targetRoles: input.targetRoles ?? ["MEMBER"],
    taskType: input.taskType ?? "MONTHLY_PER_MEMBER",
    teamId: new Types.ObjectId(),
    title: input.title,
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    zoneId: null,
    campaignOnly: false,
    maxPerWeek: input.maxPerWeek ?? null,
  };
}

describe("dashboard task progress", () => {
  it("loads monthly task submissions from the whole selected month", () => {
    const monthlyTask = makeTask({
      _id: new Types.ObjectId(),
      deadlineTime: "21:00",
      taskType: "MONTHLY_PER_MEMBER",
      title: "Monthly",
    });
    const dailyTask = makeTask({
      _id: new Types.ObjectId(),
      deadlineTime: "21:00",
      taskType: "DAILY_PER_MEMBER",
      title: "Daily",
    });

    expect(
      buildDashboardSubmissionDateFilter([monthlyTask, dailyTask], "2026-04-20"),
    ).toEqual({
      $or: [
        { date: { $regex: "^2026-04" }, taskId: { $in: [monthlyTask._id] } },
        { date: "2026-04-20", taskId: { $in: [dailyTask._id] } },
      ],
    });
  });

  it("marks monthly tasks without a goal as missing their monthly goal", () => {
    const progress = buildTaskProgress({
      taskType: "MONTHLY_PER_MEMBER",
      current: 3,
      target: null,
    });

    expect(progress).toMatchObject({
      kind: "MONTHLY_MEMBER",
      unitLabel: "lần",
      isGoalMissing: true,
      isGoalComplete: false,
    });
  });

  it("marks daily tasks complete when current days reach the monthly goal", () => {
    const progress = buildTaskProgress({
      taskType: "DAILY_PER_MEMBER",
      current: 5,
      target: 5,
    });

    expect(progress).toMatchObject({
      kind: "DAILY_MEMBER",
      unitLabel: "ngày",
      isGoalMissing: false,
      isGoalComplete: true,
    });
  });

  it("marks weekly tasks with admin weekly limits as not missing monthly goals", () => {
    const progress = buildTaskProgress({
      taskType: "WEEKLY_PER_MEMBER",
      current: 4,
      target: 8,
    });

    expect(progress).toMatchObject({
      kind: "WEEKLY_MEMBER",
      unitLabel: "lượt",
      isGoalMissing: false,
      isGoalComplete: false,
    });
  });

  it("marks weekly tasks without admin weekly limits as missing monthly goals", () => {
    const progress = buildTaskProgress({
      taskType: "WEEKLY_PER_MEMBER",
      current: 4,
      target: null,
    });

    expect(progress).toMatchObject({
      kind: "WEEKLY_MEMBER",
      unitLabel: "lượt",
      isGoalMissing: true,
      isGoalComplete: false,
    });
  });

  it("labels weekly admin limit progress as this week", () => {
    const progress = buildTaskProgress({
      taskType: "WEEKLY_PER_MEMBER",
      current: 3,
      target: 5,
    });

    expect(getTaskProgressPeriodLabel(progress, 5)).toBe(" tuần này");
  });

  it("labels weekly personal goal fallback progress as this month", () => {
    const progress = buildTaskProgress({
      taskType: "WEEKLY_PER_MEMBER",
      current: 3,
      target: 5,
    });

    expect(getTaskProgressPeriodLabel(progress, null)).toBe(" tháng này");
  });

  it("uses the monthly goal as the weekly target when no admin weekly limit is set", () => {
    const actorId = new Types.ObjectId().toString();
    const task = makeTask({
      _id: new Types.ObjectId(),
      deadlineTime: "21:00",
      maxPerWeek: null,
      taskType: "WEEKLY_PER_MEMBER",
      title: "Weekly without admin limit",
    });
    const taskId = task._id.toString();

    const card = buildTaskCard(task, {
      actorId,
      actorShape: {
        regionId: null,
        role: "MEMBER",
        teamId: task.teamId.toString(),
        zoneId: null,
      },
      dateKey: "2026-04-20",
      goalByTaskUser: new Map([[`${taskId}:${actorId}`, 6]]),
      lookup: {
        applicableCount: 1,
        applicableUserIdsByTaskId: new Map([[taskId, new Set([actorId])]]),
        applicableUsersByTaskId: new Map([[taskId, []]]),
        completedSubmissionCount: 0,
        submissionByTaskUser: new Map(),
        submissionsByTaskId: new Map(),
      },
      monthlyByTaskUser: new Map([[`${taskId}:${actorId}`, 6]]),
      reminderByTaskId: new Map(),
      totalByTask: new Map(),
      weeklyByTaskUser: new Map([[`${taskId}:${actorId}`, 2]]),
    });

    expect(card.progress).toMatchObject({
      current: 6,
      target: 6,
      isGoalMissing: false,
      isGoalComplete: true,
    });
  });

  it("uses the admin weekly limit before the user's monthly goal", () => {
    const actorId = new Types.ObjectId().toString();
    const task = makeTask({
      _id: new Types.ObjectId(),
      deadlineTime: "21:00",
      maxPerWeek: 3,
      taskType: "WEEKLY_PER_MEMBER",
      title: "Weekly with admin limit",
    });
    const taskId = task._id.toString();

    const card = buildTaskCard(task, {
      actorId,
      actorShape: {
        regionId: null,
        role: "MEMBER",
        teamId: task.teamId.toString(),
        zoneId: null,
      },
      dateKey: "2026-04-20",
      goalByTaskUser: new Map([[`${taskId}:${actorId}`, 8]]),
      lookup: {
        applicableCount: 1,
        applicableUserIdsByTaskId: new Map([[taskId, new Set([actorId])]]),
        applicableUsersByTaskId: new Map([[taskId, []]]),
        completedSubmissionCount: 0,
        submissionByTaskUser: new Map(),
        submissionsByTaskId: new Map(),
      },
      monthlyByTaskUser: new Map(),
      reminderByTaskId: new Map(),
      totalByTask: new Map(),
      weeklyByTaskUser: new Map([[`${taskId}:${actorId}`, 2]]),
    });

    expect(card.progress).toMatchObject({
      current: 2,
      target: 3,
      isGoalMissing: false,
      isGoalComplete: false,
    });
  });

  it("keeps count-total tasks out of monthly-goal missing notices", () => {
    const progress = buildTaskProgress({
      taskType: "COUNT_TOTAL",
      current: 10,
      target: null,
    });

    expect(progress).toMatchObject({
      kind: "TOTAL",
      unitLabel: "lượt",
      isGoalMissing: false,
      isGoalComplete: false,
    });
  });

  it("builds a notice only from cards missing monthly goals", () => {
    const notice = buildDashboardGoalNotice([
      makeCard(
        "monthly",
        "Nhiệm vụ tháng",
        buildTaskProgress({
          taskType: "MONTHLY_PER_MEMBER",
          current: 0,
          target: null,
        }),
      ),
      makeCard(
        "daily",
        "Nhiệm vụ ngày",
        buildTaskProgress({
          taskType: "DAILY_PER_MEMBER",
          current: 0,
          target: null,
        }),
      ),
      makeCard(
        "count",
        "Nhiệm vụ số lần",
        buildTaskProgress({
          taskType: "COUNT_TOTAL",
          current: 0,
          target: null,
        }),
      ),
      makeCard(
        "weekly",
        "Nhiệm vụ tuần",
        buildTaskProgress({
          taskType: "WEEKLY_PER_MEMBER",
          current: 0,
          target: null,
        }),
      ),
    ]);

    expect(notice?.missingCount).toBe(3);
    expect(notice?.tasks.map((task) => task.id)).toEqual([
      "monthly",
      "daily",
      "weekly",
    ]);
  });

  it("keeps weekly tasks pending after one dashboard tick until the target is reached", () => {
    const card = makeCard(
      "weekly",
      "Nhiệm vụ tuần",
      buildTaskProgress({
        taskType: "WEEKLY_PER_MEMBER",
        current: 1,
        target: 3,
      }),
    );
    card.myCompletionCount = 1;

    expect(isDashboardCardDone(card)).toBe(false);
    expect(countDashboardDoneCards([card])).toBe(0);
  });

  it("marks weekly tasks done after the weekly target is reached", () => {
    const card = makeCard(
      "weekly",
      "Nhiệm vụ tuần",
      buildTaskProgress({
        taskType: "WEEKLY_PER_MEMBER",
        current: 3,
        target: 3,
      }),
    );

    expect(isDashboardCardDone(card)).toBe(true);
  });
});

describe("task display order", () => {
  it("prioritizes saved sort order before fallback fields", () => {
    const tasks = sortTasksForDisplay([
      makeTask({
        _id: new Types.ObjectId(),
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
        deadlineTime: "19:00",
        sortOrder: null,
        title: "Fallback task",
      }),
      makeTask({
        _id: new Types.ObjectId(),
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        deadlineTime: "21:00",
        sortOrder: 200,
        title: "Second",
      }),
      makeTask({
        _id: new Types.ObjectId(),
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
        deadlineTime: "22:00",
        sortOrder: 100,
        title: "First",
      }),
    ]);

    expect(tasks.map((task) => task.title)).toEqual([
      "First",
      "Second",
      "Fallback task",
    ]);
  });
});

describe("personalized task visibility", () => {
  it("treats an explicit visible override as relevant even when the user's role is not targeted", () => {
    const task = makeTask({
      _id: new Types.ObjectId(),
      deadlineTime: "21:00",
      targetRoles: ["TEAM_LEAD"],
      title: "Leader-only task",
    });
    const user: SerializedUser = {
      id: new Types.ObjectId().toString(),
      fullName: "Member",
      role: "MEMBER",
      status: "ACTIVE",
      teamId: task.teamId.toString(),
      zoneId: null,
      regionId: null,
    };

    const visibilityOverrides = new Map([[`${task._id.toString()}:${user.id}`, true]]);

    expect(isTaskRelevantForVisibleUsers(task, [user], visibilityOverrides)).toBe(true);
  });
});
