import { describe, expect, it } from "vitest";

import {
  getAdminOperationsPeriodDateKeys,
  summarizeProgressSlots,
} from "@/lib/services/admin-operations-service";

describe("admin operations periods", () => {
  it("builds day, current Monday-Sunday week, and current month windows", () => {
    const periods = getAdminOperationsPeriodDateKeys("2026-04-22");

    expect(periods.day).toEqual(["2026-04-22"]);
    expect(periods.week).toEqual([
      "2026-04-20",
      "2026-04-21",
      "2026-04-22",
      "2026-04-23",
      "2026-04-24",
      "2026-04-25",
      "2026-04-26",
    ]);
    expect(periods.month.at(0)).toBe("2026-04-01");
    expect(periods.month.at(-1)).toBe("2026-04-30");
  });
});

describe("admin operations progress slots", () => {
  it("calculates completion percent from assigned task slots", () => {
    const summary = summarizeProgressSlots([
      { assigned: true, completed: true },
      { assigned: true, completed: false },
      { assigned: true, completed: true },
      { assigned: true, completed: false },
    ]);

    expect(summary).toEqual({
      assigned: 4,
      completed: 2,
      pending: 2,
      completionPercent: 50,
    });
  });

  it("returns zero percent when no task slot is assigned", () => {
    expect(summarizeProgressSlots([])).toEqual({
      assigned: 0,
      completed: 0,
      pending: 0,
      completionPercent: 0,
    });
  });
});
