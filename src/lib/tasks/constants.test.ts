import { describe, expect, it } from "vitest";

import {
  getMonthlyGoalLimitForTaskType,
  getTaskHeaderCompletionLabel,
  getTaskProgressUnitLabel,
  getTaskSubmitCopy,
} from "@/lib/tasks/constants";

describe("task type presentation and limits", () => {
  it("limits monthly per-member goals to one completion", () => {
    expect(getMonthlyGoalLimitForTaskType("MONTHLY_PER_MEMBER")).toBe(1);
  });

  it("does not limit daily or weekly monthly goals", () => {
    expect(getMonthlyGoalLimitForTaskType("DAILY_PER_MEMBER")).toBeNull();
    expect(getMonthlyGoalLimitForTaskType("WEEKLY_PER_MEMBER")).toBeNull();
  });

  it("uses a monthly-specific unit label", () => {
    expect(getTaskProgressUnitLabel("MONTHLY_PER_MEMBER")).toBe("lần");
    expect(getTaskProgressUnitLabel("DAILY_PER_MEMBER")).toBe("ngày");
  });

  it("uses monthly-specific submit copy", () => {
    expect(getTaskSubmitCopy("MONTHLY_PER_MEMBER")).toMatchObject({
      actionLabel: "Hoàn thành tháng này",
      completedLabel: "Đã hoàn thành tháng này",
      heading: "Hoàn thành tháng này",
      successLabel: "Đã hoàn thành tháng này.",
    });
  });

  it("uses monthly-specific header completion copy", () => {
    expect(getTaskHeaderCompletionLabel("MONTHLY_PER_MEMBER", 0)).toBe(
      "0 lần tháng này",
    );
    expect(getTaskHeaderCompletionLabel("DAILY_PER_MEMBER", 2)).toBe(
      "2 lượt hôm nay",
    );
  });
});
