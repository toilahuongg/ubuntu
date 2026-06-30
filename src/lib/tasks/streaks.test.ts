import { describe, expect, it } from "vitest";

import { calculateTaskStreakBonus } from "@/lib/tasks/streaks";

describe("calculateTaskStreakBonus", () => {
  it("awards a 7-day milestone for everyday scheduled tasks", () => {
    const result = calculateTaskStreakBonus({
      completedDateKeys: [
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
        "2026-06-06",
        "2026-06-07",
      ],
      dateKey: "2026-06-07",
      expReward: 10,
      pointReward: 10,
      task: { taskType: "DAILY_PER_MEMBER" },
    });

    expect(result).toEqual({
      awarded: true,
      bonusExp: 20,
      bonusPoints: 20,
      milestone: 7,
      streakLength: 7,
    });
  });

  it("skips unscheduled weekend days for weekday tasks", () => {
    const result = calculateTaskStreakBonus({
      completedDateKeys: [
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
        "2026-06-08",
        "2026-06-09",
      ],
      dateKey: "2026-06-09",
      expReward: 10,
      pointReward: 10,
      task: {
        taskType: "DAILY_PER_MEMBER",
        scheduleType: "WEEKLY",
        scheduledWeekdays: [1, 2, 3, 4, 5],
      },
    });

    expect(result.streakLength).toBe(7);
    expect(result.milestone).toBe(7);
    expect(result.awarded).toBe(true);
  });

  it("resets at calendar month boundaries", () => {
    const result = calculateTaskStreakBonus({
      completedDateKeys: [
        "2026-05-30",
        "2026-05-31",
        "2026-06-01",
      ],
      dateKey: "2026-06-01",
      expReward: 10,
      pointReward: 10,
      task: { taskType: "DAILY_PER_MEMBER" },
    });

    expect(result).toMatchObject({
      awarded: false,
      milestone: null,
      streakLength: 1,
    });
  });

  it("does not award non-milestone streak lengths", () => {
    const result = calculateTaskStreakBonus({
      completedDateKeys: [
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
      ],
      dateKey: "2026-06-03",
      expReward: 10,
      pointReward: 10,
      task: { taskType: "DAILY_PER_MEMBER" },
    });

    expect(result).toEqual({
      awarded: false,
      bonusExp: 0,
      bonusPoints: 0,
      milestone: null,
      streakLength: 3,
    });
  });

  it.each([
    { bonus: 30, milestone: 14 },
    { bonus: 40, milestone: 21 },
    { bonus: 50, milestone: 28 },
  ])(
    "awards a different multiplier for the $milestone-day milestone",
    ({ bonus, milestone }) => {
      const completedDateKeys = Array.from({ length: milestone }, (_, index) => {
        const day = String(index + 1).padStart(2, "0");
        return `2026-06-${day}`;
      });

      const result = calculateTaskStreakBonus({
        completedDateKeys,
        dateKey: completedDateKeys[completedDateKeys.length - 1],
        expReward: 10,
        pointReward: 10,
        task: { taskType: "DAILY_PER_MEMBER" },
      });

      expect(result).toEqual({
        awarded: true,
        bonusExp: bonus,
        bonusPoints: bonus,
        milestone,
        streakLength: milestone,
      });
    },
  );

  it("counts monthly scheduled days only", () => {
    const result = calculateTaskStreakBonus({
      completedDateKeys: [
        "2026-06-01",
        "2026-06-08",
        "2026-06-15",
        "2026-06-22",
        "2026-06-29",
      ],
      dateKey: "2026-06-29",
      expReward: 10,
      pointReward: 10,
      task: {
        taskType: "DAILY_PER_MEMBER",
        scheduleType: "MONTHLY",
        scheduledMonthDays: [1, 8, 15, 22, 29],
      },
    });

    expect(result).toMatchObject({
      awarded: false,
      milestone: null,
      streakLength: 5,
    });
  });
});
