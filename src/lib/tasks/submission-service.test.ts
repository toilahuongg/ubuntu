import { describe, expect, it } from "vitest";

import {
  clampSubmissionCountForTaskType,
  shouldIgnoreDuplicateSingleCompletionTask,
} from "@/lib/tasks/submission-service";

describe("submission limits", () => {
  it("caps monthly per-member submissions at one completion", () => {
    expect(clampSubmissionCountForTaskType("MONTHLY_PER_MEMBER", 5)).toBe(1);
  });

  it("does not cap weekly per-member submissions", () => {
    expect(clampSubmissionCountForTaskType("WEEKLY_PER_MEMBER", 5)).toBe(5);
  });

  it("ignores repeated monthly per-member increments for an existing completion", () => {
    expect(
      shouldIgnoreDuplicateSingleCompletionTask({
        existingCompletionCount: 1,
        mode: "increment",
        taskType: "MONTHLY_PER_MEMBER",
      }),
    ).toBe(true);
  });
});
