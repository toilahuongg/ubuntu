import { describe, it, expect } from "vitest";
import { taskInputSchema } from "@/lib/validation";

describe("Task DTT Field Validation", () => {
  it("should accept optional isDtt field in validation", () => {
    const parsed = taskInputSchema.safeParse({
      title: "Test Task Name",
      deadlineTime: "21:00",
      targetRoles: ["MEMBER"],
      isDtt: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isDtt).toBe(true);
    }
  });

  it("should default isDtt to false if omitted", () => {
    const parsed = taskInputSchema.safeParse({
      title: "Test Task Name",
      deadlineTime: "21:00",
      targetRoles: ["MEMBER"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isDtt).toBe(false);
    }
  });
});
