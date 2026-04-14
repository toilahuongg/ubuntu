import { describe, expect, it } from "vitest";

import { taskTemplateInputSchema } from "@/lib/validation";

describe("taskTemplateInputSchema", () => {
  it("accepts valid input", () => {
    const result = taskTemplateInputSchema.parse({
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
      taskTemplateInputSchema.parse({
        deadlineTime: "25:00",
        title: "Test",
      }),
    ).toThrow("Deadline phải theo HH:mm");
  });

  it("rejects title that is too short", () => {
    expect(() =>
      taskTemplateInputSchema.parse({
        deadlineTime: "17:30",
        title: "AB",
      }),
    ).toThrow("Tiêu đề quá ngắn");
  });
});
