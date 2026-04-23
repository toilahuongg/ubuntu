import { describe, expect, it } from "vitest";

import {
  moveTaskInputSchema,
  taskInputSchema,
  taskReminderPreferenceInputSchema,
} from "@/lib/validation";

describe("taskInputSchema", () => {
  it("accepts valid input", () => {
    const result = taskInputSchema.parse({
      deadlineTime: "17:30",
      description: "Test task",
      expReward: 10,
      isActive: true,
      targetRoles: ["MEMBER"],
      title: "Daily check-in",
    });

    expect(result.title).toBe("Daily check-in");
    expect(result.expReward).toBe(10);
  });

  it("accepts daily tasks with monthly goals", () => {
    const result = taskInputSchema.parse({
      deadlineTime: "17:30",
      taskType: "DAILY_PER_MEMBER",
      targetRoles: ["NGV", "MEMBER"],
      title: "Daily check-in",
    });

    expect(result.taskType).toBe("DAILY_PER_MEMBER");
  });

  it("requires a target for count total tasks", () => {
    expect(() =>
      taskInputSchema.parse({
        deadlineTime: "17:30",
        taskType: "COUNT_TOTAL",
        targetRoles: ["MEMBER"],
        title: "Count total",
      }),
    ).toThrow("Task theo số lần cần nhập mục tiêu ≥ 1.");
  });

  it("rejects invalid deadline format", () => {
    expect(() =>
      taskInputSchema.parse({
        deadlineTime: "25:00",
        targetRoles: ["MEMBER"],
        title: "Test",
      }),
    ).toThrow("Deadline phải theo HH:mm");
  });

  it("rejects title that is too short", () => {
    expect(() =>
      taskInputSchema.parse({
        deadlineTime: "17:30",
        targetRoles: ["MEMBER"],
        title: "AB",
      }),
    ).toThrow("Tiêu đề quá ngắn");
  });

  it("requires at least one target role", () => {
    expect(() =>
      taskInputSchema.parse({
        deadlineTime: "17:30",
        targetRoles: [],
        title: "Daily check-in",
      }),
    ).toThrow("Vui lòng chọn ít nhất một vai trò nhận nhiệm vụ.");
  });

  it("rejects invalid target roles", () => {
    expect(() =>
      taskInputSchema.parse({
        deadlineTime: "17:30",
        targetRoles: ["INVALID_ROLE"],
        title: "Daily check-in",
      }),
    ).toThrow();
  });
});

describe("taskReminderPreferenceInputSchema", () => {
  it("accepts enabled and disabled reminder preferences", () => {
    expect(
      taskReminderPreferenceInputSchema.parse({
        enabled: true,
        reminderTime: "08:15",
        taskId: "task-1",
      }),
    ).toMatchObject({ enabled: true, reminderTime: "08:15" });

    expect(
      taskReminderPreferenceInputSchema.parse({
        enabled: false,
        reminderTime: "21:00",
        taskId: "task-1",
      }),
    ).toMatchObject({ enabled: false, reminderTime: "21:00" });
  });

  it("rejects invalid reminder preference input", () => {
    expect(() =>
      taskReminderPreferenceInputSchema.parse({
        enabled: true,
        reminderTime: "25:00",
        taskId: "task-1",
      }),
    ).toThrow("Giờ nhắc phải theo HH:mm");

    expect(() =>
      taskReminderPreferenceInputSchema.parse({
        enabled: true,
        reminderTime: "08:15",
        taskId: "",
      }),
    ).toThrow("Thiếu mã nhiệm vụ.");
  });
});

describe("moveTaskInputSchema", () => {
  it("accepts valid move directions", () => {
    expect(
      moveTaskInputSchema.parse({
        direction: "up",
        taskId: "task-1",
      }),
    ).toMatchObject({ direction: "up", taskId: "task-1" });

    expect(
      moveTaskInputSchema.parse({
        direction: "down",
        taskId: "task-1",
      }),
    ).toMatchObject({ direction: "down", taskId: "task-1" });
  });

  it("rejects invalid move directions", () => {
    expect(() =>
      moveTaskInputSchema.parse({
        direction: "left",
        taskId: "task-1",
      }),
    ).toThrow("Hướng sắp xếp không hợp lệ.");
  });
});
