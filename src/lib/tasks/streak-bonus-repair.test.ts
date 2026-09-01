import { describe, expect, it } from "vitest";

import {
  buildMissingTaskStreakBonusRepairs,
  buildTaskStreakBonusRepairCreateOptions,
} from "@/lib/tasks/streak-bonus-repair";

const task = {
  expReward: 10,
  id: "task-1",
  pointReward: 5,
  scheduleType: "EVERY_DAY" as const,
  title: "Daily Task",
  taskType: "DAILY_PER_MEMBER" as const,
};

describe("buildMissingTaskStreakBonusRepairs", () => {
  it("backfills the same milestone in a later reward month", () => {
    const submissions = [
      ...Array.from({ length: 7 }, (_, index) => ({
        date: `2026-07-${String(index + 1).padStart(2, "0")}`,
        taskId: "task-1",
        userId: "user-1",
      })),
      ...Array.from({ length: 7 }, (_, index) => ({
        date: `2026-08-${String(index + 1).padStart(2, "0")}`,
        taskId: "task-1",
        userId: "user-1",
      })),
    ];

    const rows = buildMissingTaskStreakBonusRepairs({
      existingPointBonuses: [
        {
          createdAt: new Date("2026-07-07T12:00:00.000Z"),
          description: "Thưởng chuỗi 7 ngày: Daily Task",
          taskId: "task-1",
          userId: "user-1",
        },
      ],
      existingXpBonuses: [
        {
          createdAt: new Date("2026-07-07T12:00:00.000Z"),
          description: "Thưởng chuỗi 7 ngày: Daily Task",
          taskId: "task-1",
          userId: "user-1",
        },
      ],
      submissions,
      tasks: [task],
    });

    expect(rows).toEqual([
      {
        bonusExp: 5,
        bonusPoints: 2,
        date: "2026-08-07",
        description: "Thưởng chuỗi 7 ngày (2026-08): Daily Task",
        milestone: 7,
        periodKey: "2026-08",
        taskId: "task-1",
        taskTitle: "Daily Task",
        userId: "user-1",
      },
    ]);
  });

  it("does not backfill legacy bonuses created in the same reward month", () => {
    const submissions = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      taskId: "task-1",
      userId: "user-1",
    }));

    const rows = buildMissingTaskStreakBonusRepairs({
      existingPointBonuses: [
        {
          createdAt: new Date("2026-08-07T12:00:00.000Z"),
          description: "Thưởng chuỗi 7 ngày: Daily Task",
          taskId: "task-1",
          userId: "user-1",
        },
      ],
      existingXpBonuses: [
        {
          createdAt: new Date("2026-08-07T12:00:00.000Z"),
          description: "Thưởng chuỗi 7 ngày: Daily Task",
          taskId: "task-1",
          userId: "user-1",
        },
      ],
      submissions,
      tasks: [task],
    });

    expect(rows).toEqual([]);
  });

  it("sets ordered create options when a mongoose session is present", () => {
    const session = { id: "session" };

    expect(
      buildTaskStreakBonusRepairCreateOptions(
        session as unknown as Parameters<
          typeof buildTaskStreakBonusRepairCreateOptions
        >[0],
      ),
    ).toEqual({ ordered: true, session });
    expect(buildTaskStreakBonusRepairCreateOptions(null)).toBeUndefined();
  });
});
