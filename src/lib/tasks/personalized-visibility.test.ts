import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import type { TaskRecord } from "@/lib/models";
import { buildDueTaskReminderCandidatesFromData } from "@/lib/tasks/reminder-service";
import { buildDashboardLookup, buildTaskCard } from "@/lib/tasks/dashboard-service";

describe("Personalized Task Visibility Unit Logic", () => {
  const ids = {
    user: new Types.ObjectId(),
    task: new Types.ObjectId(),
    team: new Types.ObjectId(),
  };

  it("should filter out reminder candidates if visibility override is false", () => {
    const mockTask: TaskRecord = {
      _id: ids.task,
      completedAt: null,
      completionMessage: "",
      createdAt: new Date(),
      createdBy: new Types.ObjectId(),
      deadlineTime: "22:00",
      description: "Test Task",
      expReward: 10,
      isActive: true,
      lateWindowDays: 7,
      pointReward: 10,
      regionId: null,
      scope: "TEAM",
      sortOrder: 100,
      submissionMessage: "",
      targetCount: null,
      targetRoles: ["MEMBER"],
      taskType: "DAILY_PER_MEMBER",
      teamId: ids.team,
      title: "Test Task",
      updatedAt: new Date(),
      zoneId: null,
      campaignOnly: false,
      maxPerWeek: null,
    };

    const mockUser = {
      _id: ids.user,
      regionId: null,
      role: "MEMBER" as const,
      status: "ACTIVE" as const,
      teamId: ids.team,
      telegramId: 123456,
      zoneId: null,
    };

    const visibilityOverrides = new Map<string, boolean>();
    // Đặt override ẩn nhiệm vụ này với thành viên
    visibilityOverrides.set(`${ids.task.toString()}:${ids.user.toString()}`, false);

    const candidates = buildDueTaskReminderCandidatesFromData({
      dateKey: "2026-06-29",
      preferences: [],
      sentLogs: [],
      submissions: [],
      sweepAt: new Date("2026-06-29T14:32:00Z"), // 2 phút sau giờ nhắc nhở (21:30 VN / 14:30 UTC)
      tasks: [mockTask],
      users: [mockUser],
      visibilityOverrides,
    });

    // Vì đã bị ghi đè ẩn, không có ứng viên nhắc nhở nào được tạo ra
    expect(candidates.length).toBe(0);
  });

  it("should keep reminder candidates if visibility override is true/missing", () => {
    const mockTask: TaskRecord = {
      _id: ids.task,
      completedAt: null,
      completionMessage: "",
      createdAt: new Date(),
      createdBy: new Types.ObjectId(),
      deadlineTime: "22:00",
      description: "Test Task",
      expReward: 10,
      isActive: true,
      lateWindowDays: 7,
      pointReward: 10,
      regionId: null,
      scope: "TEAM",
      sortOrder: 100,
      submissionMessage: "",
      targetCount: null,
      targetRoles: ["MEMBER"],
      taskType: "DAILY_PER_MEMBER",
      teamId: ids.team,
      title: "Test Task",
      updatedAt: new Date(),
      zoneId: null,
      campaignOnly: false,
      maxPerWeek: null,
    };

    const mockUser = {
      _id: ids.user,
      regionId: null,
      role: "MEMBER" as const,
      status: "ACTIVE" as const,
      teamId: ids.team,
      telegramId: 123456,
      zoneId: null,
    };

    const candidates = buildDueTaskReminderCandidatesFromData({
      dateKey: "2026-06-29",
      preferences: [],
      sentLogs: [],
      submissions: [],
      sweepAt: new Date("2026-06-29T14:32:00Z"), // 2 phút sau giờ nhắc nhở (21:30 VN / 14:30 UTC)
      tasks: [mockTask],
      users: [mockUser],
      // Không truyền visibilityOverrides (sử dụng mặc định là hiển thị)
    });

    // Mặc định là hiển thị nên sẽ tạo ra 1 ứng viên nhắc nhở
    expect(candidates.length).toBe(1);
    expect(candidates[0].userId).toBe(ids.user.toString());
  });

  it("should calculate isApplicableToActor in buildTaskCard correctly using visibility overrides", () => {
    const mockTask: TaskRecord = {
      _id: ids.task,
      completedAt: null,
      completionMessage: "",
      createdAt: new Date(),
      createdBy: new Types.ObjectId(),
      deadlineTime: "22:00",
      description: "Test Task",
      expReward: 10,
      isActive: true,
      lateWindowDays: 7,
      pointReward: 10,
      regionId: null,
      scope: "TEAM",
      sortOrder: 100,
      submissionMessage: "",
      targetCount: null,
      targetRoles: ["MEMBER"],
      taskType: "DAILY_PER_MEMBER",
      teamId: ids.team,
      title: "Test Task",
      updatedAt: new Date(),
      zoneId: null,
      campaignOnly: false,
      maxPerWeek: null,
    };

    const mockUser = {
      id: ids.user.toString(),
      _id: ids.user,
      regionId: null,
      role: "MEMBER" as const,
      status: "ACTIVE" as const,
      teamId: ids.team.toString(),
      telegramId: 123456,
      zoneId: null,
    };

    // Case 1: override is false (hidden)
    const visibilityOverrides1 = new Map<string, boolean>();
    visibilityOverrides1.set(`${ids.task.toString()}:${ids.user.toString()}`, false);

    const lookup1 = buildDashboardLookup([mockTask], [mockUser], [], visibilityOverrides1);
    const card1 = buildTaskCard(mockTask, {
      actorId: ids.user.toString(),
      actorShape: {
        teamId: ids.team.toString(),
        zoneId: null,
        regionId: null,
        role: "MEMBER",
      },
      dateKey: "2026-06-29",
      lookup: lookup1,
      totalByTask: new Map(),
      monthlyByTaskUser: new Map(),
      goalByTaskUser: new Map(),
      reminderByTaskId: new Map(),
      weeklyByTaskUser: new Map<string, number>(),
    });

    expect(card1.isApplicableToActor).toBe(false);

    // Case 2: override is true (forced show/visible)
    const visibilityOverrides2 = new Map<string, boolean>();
    visibilityOverrides2.set(`${ids.task.toString()}:${ids.user.toString()}`, true);

    const lookup2 = buildDashboardLookup([mockTask], [mockUser], [], visibilityOverrides2);
    // Let's make user's role normally incompatible (e.g. they are a TEAM_LEAD, task is for MEMBER)
    const card2 = buildTaskCard(mockTask, {
      actorId: ids.user.toString(),
      actorShape: {
        teamId: ids.team.toString(),
        zoneId: null,
        regionId: null,
        role: "TEAM_LEAD", // Normally incompatible role
      },
      dateKey: "2026-06-29",
      lookup: lookup2,
      totalByTask: new Map(),
      monthlyByTaskUser: new Map(),
      goalByTaskUser: new Map(),
      reminderByTaskId: new Map(),
      weeklyByTaskUser: new Map<string, number>(),
    });

    expect(card2.isApplicableToActor).toBe(true); // Should be true because of visibility override!
  });
});
