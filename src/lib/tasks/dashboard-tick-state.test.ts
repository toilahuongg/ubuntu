import { describe, expect, it } from "vitest";

import { resolveDashboardTickState } from "@/lib/tasks/dashboard-tick-state";

describe("dashboard tick state", () => {
  it("uses set mode to tick weekly tasks once from the dashboard", () => {
    const state = resolveDashboardTickState({
      isGoalComplete: false,
      maxPerWeek: 3,
      optimisticCount: 0,
      status: "OPEN",
      taskType: "WEEKLY_PER_MEMBER",
      weeklyCompletion: 0,
    });

    expect(state.disabled).toBe(false);
    expect(state.submitCount).toBe(1);
    expect(state.submitMode).toBe("set");
    expect(state.nextCount).toBe(1);
  });

  it("allows weekly dashboard ticks to be removed instead of incrementing again", () => {
    const state = resolveDashboardTickState({
      isGoalComplete: false,
      maxPerWeek: 3,
      optimisticCount: 1,
      status: "OPEN",
      taskType: "WEEKLY_PER_MEMBER",
      weeklyCompletion: 1,
    });

    expect(state.disabled).toBe(false);
    expect(state.submitCount).toBe(0);
    expect(state.submitMode).toBe("set");
    expect(state.nextCount).toBe(0);
    expect(state.shouldRenderChecked).toBe(true);
  });

  it("does not allow a new weekly dashboard tick after the weekly limit is reached", () => {
    const state = resolveDashboardTickState({
      isGoalComplete: true,
      maxPerWeek: 3,
      optimisticCount: 0,
      status: "OPEN",
      taskType: "WEEKLY_PER_MEMBER",
      weeklyCompletion: 3,
    });

    expect(state.disabled).toBe(true);
    expect(state.shouldRenderButton).toBe(false);
  });

  it("still allows removing an existing weekly dashboard tick after the goal is complete", () => {
    const state = resolveDashboardTickState({
      isGoalComplete: true,
      maxPerWeek: 3,
      optimisticCount: 1,
      status: "OPEN",
      taskType: "WEEKLY_PER_MEMBER",
      weeklyCompletion: 3,
    });

    expect(state.disabled).toBe(false);
    expect(state.shouldRenderButton).toBe(true);
    expect(state.submitCount).toBe(0);
    expect(state.submitMode).toBe("set");
  });
});
