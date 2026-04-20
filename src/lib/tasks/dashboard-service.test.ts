import { describe, expect, it } from "vitest";

import {
  buildDashboardGoalNotice,
  buildTaskProgress,
} from "@/lib/tasks/dashboard-service";
import type { TaskCard, TaskProgress } from "@/lib/tasks/types";

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
    expReward: 10,
    pointReward: 10,
    status: "OPEN",
    completionCount: 0,
    totalCount: 1,
    myCompletionCount: 0,
    taskType:
      progress.kind === "DAILY_MEMBER"
        ? "DAILY_PER_MEMBER"
        : progress.kind === "MONTHLY_MEMBER"
          ? "MONTHLY_PER_MEMBER"
          : "COUNT_TOTAL",
    isApplicableToActor: true,
    progress,
  };
}

describe("dashboard task progress", () => {
  it("marks monthly tasks without a goal as missing their monthly goal", () => {
    const progress = buildTaskProgress({
      taskType: "MONTHLY_PER_MEMBER",
      current: 3,
      target: null,
    });

    expect(progress).toMatchObject({
      kind: "MONTHLY_MEMBER",
      unitLabel: "lượt",
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
    ]);

    expect(notice?.missingCount).toBe(2);
    expect(notice?.tasks.map((task) => task.id)).toEqual([
      "monthly",
      "daily",
    ]);
  });
});
