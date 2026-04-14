import { describe, expect, it } from "vitest";

import { taskInputSchema } from "@/lib/validation";

describe("taskInputSchema", () => {
  it("accepts valid input", () => {
    const result = taskInputSchema.parse({
      deadlineTime: "17:30",
      description: "Test task",
      expReward: 10,
      isActive: true,
      title: "Daily check-in",
    });

    expect(result.title).toBe("Daily check-in");
    expect(result.expReward).toBe(10);
  });

  it("rejects invalid deadline format", () => {
    expect(() =>
      taskInputSchema.parse({
        deadlineTime: "25:00",
        title: "Test",
      }),
    ).toThrow("Deadline phải theo HH:mm");
  });

  it("rejects title that is too short", () => {
    expect(() =>
      taskInputSchema.parse({
        deadlineTime: "17:30",
        title: "AB",
      }),
    ).toThrow("Tiêu đề quá ngắn");
  });
});
