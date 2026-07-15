import { describe, expect, it } from "vitest";

import {
  planWeeklyLimitRepairs,
  type WeeklyLimitRepairSubmission,
  type WeeklyLimitRepairTask,
  type WeeklyLimitRepairUser,
} from "@/lib/tasks/weekly-limit-repair";

const task: WeeklyLimitRepairTask = {
  id: "task-weekly",
  expReward: 10,
  maxPerWeek: 5,
  pointReward: 4,
  title: "Weekly Task",
};

const user: WeeklyLimitRepairUser = {
  id: "user-1",
  fullName: "User One",
  pointBalance: 6,
  totalXp: 100,
};

function submission(
  input: Partial<WeeklyLimitRepairSubmission> &
    Pick<WeeklyLimitRepairSubmission, "id" | "completionCount" | "date">,
): WeeklyLimitRepairSubmission {
  return {
    createdAt: new Date(`${input.date}T01:00:00.000Z`),
    submittedAt: new Date(`${input.date}T02:00:00.000Z`),
    subjectUserId: "user-1",
    taskId: "task-weekly",
    ...input,
  };
}

describe("planWeeklyLimitRepairs", () => {
  it("keeps the oldest submissions in a Sunday-Saturday week and deletes newer overflow", () => {
    const plan = planWeeklyLimitRepairs({
      fromDate: "2026-07-01",
      submissions: [
        submission({ id: "old-1", date: "2026-07-05", completionCount: 2 }),
        submission({ id: "old-2", date: "2026-07-06", completionCount: 3 }),
        submission({ id: "new-over", date: "2026-07-07", completionCount: 1 }),
      ],
      tasks: [task],
      users: [user],
    });

    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]).toMatchObject({
      completionCountDeleted: 1,
      completionCountKept: 5,
      limit: 5,
      taskTitle: "Weekly Task",
      userFullName: "User One",
      weekEnd: "2026-07-11",
      weekStart: "2026-07-05",
    });
    expect(plan.groups[0].deletedSubmissionIds).toEqual(["new-over"]);
    expect(plan.userDeductions).toEqual([
      {
        pointBalanceAfter: 2,
        pointBalanceBefore: 6,
        pointsDeducted: 4,
        totalXpAfter: 90,
        totalXpBefore: 100,
        userFullName: "User One",
        userId: "user-1",
        xpDeducted: 10,
      },
    ]);
    expect(plan.totals).toMatchObject({
      completionCountDeleted: 1,
      overflowGroups: 1,
      pointsDeducted: 4,
      submissionsDeleted: 1,
      xpDeducted: 10,
    });
  });

  it("deletes a whole submission when only part of its count would fit", () => {
    const plan = planWeeklyLimitRepairs({
      fromDate: "2026-07-01",
      submissions: [
        submission({ id: "kept", date: "2026-07-05", completionCount: 4 }),
        submission({ id: "too-large", date: "2026-07-06", completionCount: 3 }),
      ],
      tasks: [task],
      users: [user],
    });

    expect(plan.groups[0]).toMatchObject({
      completionCountDeleted: 3,
      completionCountKept: 4,
    });
    expect(plan.groups[0].deletedSubmissionIds).toEqual(["too-large"]);
  });

  it("clamps point balance deductions to zero", () => {
    const plan = planWeeklyLimitRepairs({
      fromDate: "2026-07-01",
      submissions: [
        submission({ id: "kept", date: "2026-07-05", completionCount: 5 }),
        submission({ id: "overflow", date: "2026-07-06", completionCount: 5 }),
      ],
      tasks: [task],
      users: [{ ...user, pointBalance: 3 }],
    });

    expect(plan.userDeductions).toEqual([
      expect.objectContaining({
        pointBalanceAfter: 0,
        pointBalanceBefore: 3,
        pointsDeducted: 20,
      }),
    ]);
  });
});
