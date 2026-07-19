import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import {
  isTaskAssignedToAnyDttClass,
  getDttClassTaskIdsForUser,
  buildClassTaskCard,
  mapDttClassTasksByClass,
} from "./class-task-service";
import type { TaskRecord } from "@/lib/models";

const makeTask = (overrides: Partial<TaskRecord> = {}): TaskRecord =>
  ({
    _id: new Types.ObjectId(),
    title: "Test Task",
    description: "",
    teamId: new Types.ObjectId(),
    createdBy: new Types.ObjectId(),
    deadlineTime: "20:00",
    expReward: 10,
    pointReward: 10,
    lateWindowDays: 7,
    sortOrder: null,
    isActive: true,
    campaignOnly: false,
    regionId: null,
    scope: "TEAM" as const,
    taskType: "DAILY_PER_MEMBER",
    scheduleType: "EVERY_DAY",
    scheduledWeekdays: [],
    scheduledMonthDays: [],
    targetCount: null,
    targetRoles: undefined,
    submissionMessage: "",
    completionMessage: "",
    completedAt: null,
    zoneId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TaskRecord);

describe("isTaskAssignedToAnyDttClass", () => {
  it("returns false when taskIds set is empty", () => {
    const taskIds = new Set<string>();
    expect(isTaskAssignedToAnyDttClass("abc", taskIds)).toBe(false);
  });

  it("returns true when taskId is in the set", () => {
    const taskIds = new Set(["abc", "def"]);
    expect(isTaskAssignedToAnyDttClass("abc", taskIds)).toBe(true);
  });

  it("returns false when taskId is not in the set", () => {
    const taskIds = new Set(["abc", "def"]);
    expect(isTaskAssignedToAnyDttClass("xyz", taskIds)).toBe(false);
  });
});

describe("getDttClassTaskIdsForUser", () => {
  it("returns empty array when userClasses is empty", () => {
    const result = getDttClassTaskIdsForUser([], new Map());
    expect(result).toEqual([]);
  });

  it("collects taskIds across multiple classes", () => {
    const classTasks = new Map<string, string[]>([
      ["class1", ["taskA", "taskB"]],
      ["class2", ["taskC"]],
    ]);
    const userClasses = [
      { classId: "class1" },
      { classId: "class2" },
    ];
    const result = getDttClassTaskIdsForUser(userClasses, classTasks);
    expect(result.sort()).toEqual(["taskA", "taskB", "taskC"]);
  });

  it("deduplicates taskIds when task appears in multiple classes", () => {
    const classTasks = new Map<string, string[]>([
      ["class1", ["taskA", "taskB"]],
      ["class2", ["taskB", "taskC"]],
    ]);
    const userClasses = [
      { classId: "class1" },
      { classId: "class2" },
    ];
    const result = getDttClassTaskIdsForUser(userClasses, classTasks);
    expect(result.sort()).toEqual(["taskA", "taskB", "taskC"]);
  });
});

describe("mapDttClassTasksByClass", () => {
  it("skips assignments whose populated task was deleted", () => {
    const classId = new Types.ObjectId();
    const taskId = new Types.ObjectId();

    const result = mapDttClassTasksByClass([
      {
        classId,
        taskId: null,
        isInherited: true,
      },
      {
        classId,
        taskId: {
          _id: taskId,
          title: "Existing task",
        },
        isInherited: false,
      },
    ]);

    expect(result).toEqual({
      [classId.toString()]: [
        {
          taskId: taskId.toString(),
          taskTitle: "Existing task",
          description: "",
          deadlineTime: "20:00",
          expReward: 10,
          lateWindowDays: 7,
          targetRoles: [],
          submissionMessage: "",
          isInherited: false,
        },
      ],
    });
  });

  it("maps custom class task edit fields from the populated task", () => {
    const classId = new Types.ObjectId();
    const taskId = new Types.ObjectId();

    const result = mapDttClassTasksByClass([
      {
        classId,
        taskId: {
          _id: taskId,
          title: "Đọc kinh Sáng",
          description: "Đọc theo tài liệu lớp",
          deadlineTime: "06:30",
          expReward: 15,
          lateWindowDays: 3,
          targetRoles: ["MEMBER", "TDM"],
          submissionMessage: "Đã đọc xong",
        },
        isInherited: false,
      },
    ]);

    expect(result[classId.toString()]).toEqual([
      {
        taskId: taskId.toString(),
        taskTitle: "Đọc kinh Sáng",
        description: "Đọc theo tài liệu lớp",
        deadlineTime: "06:30",
        expReward: 15,
        lateWindowDays: 3,
        targetRoles: ["MEMBER", "TDM"],
        submissionMessage: "Đã đọc xong",
        isInherited: false,
      },
    ]);
  });
});

describe("buildClassTaskCard", () => {
  it("zeros pointReward for custom tasks (isInherited: false)", () => {
    const task = makeTask({ pointReward: 15, expReward: 20 });
    const card = buildClassTaskCard(task, "2026-07-12", false, 0);
    expect(card.pointReward).toBe(0);
    expect(card.expReward).toBe(20);
  });

  it("keeps pointReward for inherited tasks (isInherited: true)", () => {
    const task = makeTask({ pointReward: 15, expReward: 20 });
    const card = buildClassTaskCard(task, "2026-07-12", true, 0);
    expect(card.pointReward).toBe(15);
    expect(card.expReward).toBe(20);
  });
});
