import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/notifications/submission-notifier", () => ({
  notifySubmissionToGroups: vi.fn().mockResolvedValue(undefined),
  notifyTaskCompletionToGroups: vi.fn().mockResolvedValue(undefined),
}));

import {
  saveSubmission,
  clampSubmissionCountForTaskType,
  shouldIgnoreDuplicateSingleCompletionTask,
} from "./submission-service";
import {
  UserModel,
  TaskModel,
  TeamModel,
  PointTransactionModel,
  XpTransactionModel,
  SubmissionModel,
} from "../models";
import type { SessionUser } from "../domain";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.SESSION_SECRET = "test-secret-session-key-123456789";
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  await mongoose.connect(uri, { dbName: "submission-service-test" });
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("submission limits", () => {
  it("caps monthly per-member submissions at one completion", () => {
    expect(clampSubmissionCountForTaskType("MONTHLY_PER_MEMBER", 5)).toBe(1);
  });

  it("caps weekly per-member at maxPerWeek when set, no cap when null", () => {
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

describe("weekly maxPerWeek limits", () => {
  it("rejects submission when count would exceed maxPerWeek", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_1",
      name: "Test Team Weekly 1",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 1",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 0,
      pointBalance: 0,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly Limited Task",
      description: "Test weekly task with maxPerWeek",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: 3,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 3,
      mode: "set",
    });

    await expect(
      saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-14", {
        count: 1,
        mode: "set",
      }),
    ).rejects.toThrow("Đã đạt giới hạn số lần hoàn thành tuần này.");
  });

  it("allows submission when at exactly maxPerWeek with increment mode", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_2",
      name: "Test Team Weekly 2",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 2",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 0,
      pointBalance: 0,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly Task 2",
      description: "Test",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: 2,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // 2026-07-12 is Sun (week starts Sun)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-12", {
      count: 1,
      mode: "increment",
    });

    const result = await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 1,
      mode: "increment",
    });
    expect(result.completionCount).toBe(1);

    // 2026-07-14 is Tue, same week, should hit the limit (total would be 3 > maxPerWeek=2)
    await expect(
      saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-14", {
        count: 1,
        mode: "increment",
      }),
    ).rejects.toThrow("Đã đạt giới hạn số lần hoàn thành tuần này.");
  });

  it("does not limit weekly tasks when maxPerWeek is null", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_3",
      name: "Test Team Weekly 3",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 3",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 0,
      pointBalance: 0,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly No Limit",
      description: "Test",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: null,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    const result = await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 5,
      mode: "set",
    });
    expect(result.completionCount).toBe(5);
  });

  it("allows decreasing count even when previously at limit", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_4",
      name: "Test Team Weekly 4",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 4",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 100,
      pointBalance: 100,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly Decrease",
      description: "Test",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: 3,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 2,
      mode: "set",
    });

    const result = await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 0,
      mode: "set",
    });
    expect(result.completionCount).toBe(0);
  });

  it("counts backfill submissions toward weekly limit", async () => {
    const team = await TeamModel.create({
      code: "TEST_WEEKLY_5",
      name: "Test Team Weekly 5",
    });

    const user = await UserModel.create({
      fullName: "Weekly User 5",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 0,
      pointBalance: 0,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Weekly Backfill",
      description: "Test",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
      maxPerWeek: 2,
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // Submit on Monday (2026-07-13)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-13", {
      count: 1,
      mode: "set",
    });

    // Backfill on Sunday (2026-07-12, same week Sun-Sat)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-12", {
      count: 1,
      mode: "set",
    });

    // Total is 2 = maxPerWeek. Another submit should fail.
    await expect(
      saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-14", {
        count: 1,
        mode: "increment",
      }),
    ).rejects.toThrow("Đã đạt giới hạn số lần hoàn thành tuần này.");
  });
});

describe("saveSubmission points/XP subtraction and deletion", () => {
  it("deducts correct points and XP when deleting a submission with multiple completions", async () => {
    const team = await TeamModel.create({
      code: "TEST_TEAM_SUB",
      name: "Test Team Sub",
    });

    const user = await UserModel.create({
      fullName: "Sub User 1",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 100,
      pointBalance: 100,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Speaking Task",
      description: "Test speaking task",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // 1. Submit with 10 completions
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-07", {
      count: 10,
      mode: "set",
    });

    // Verify user balance after submitting 10 times:
    // XP should be: 100 + 10 * 10 = 200
    // Points should be: 100 + 10 * 5 = 150
    let updatedUser = await UserModel.findById(user._id).lean();
    expect(updatedUser?.totalXp).toBe(200);
    expect(updatedUser?.pointBalance).toBe(150);

    // 2. Clear submission (set to 0)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-07", {
      count: 0,
      mode: "set",
    });

    // Verify user balance after clearing:
    // Should return to starting balance (XP: 100, Points: 100)
    updatedUser = await UserModel.findById(user._id).lean();
    expect(updatedUser?.totalXp).toBe(100);
    expect(updatedUser?.pointBalance).toBe(100);

    // Verify negative transactions were created
    const negativeXp = await XpTransactionModel.findOne({
      userId: user._id,
      amount: -100,
      description: `Huỷ hoàn thành: ${task.title}`,
    }).lean();
    expect(negativeXp).not.toBeNull();

    const negativePoints = await PointTransactionModel.findOne({
      userId: user._id,
      amount: -50,
      description: `Huỷ thưởng nhiệm vụ: ${task.title}`,
    }).lean();
    expect(negativePoints).not.toBeNull();
  });

  it("deducts correct points and XP when decreasing submission count from 10 to 3", async () => {
    const team = await TeamModel.create({
      code: "TEST_TEAM_SUB_2",
      name: "Test Team Sub 2",
    });

    const user = await UserModel.create({
      fullName: "Sub User 2",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 100,
      pointBalance: 100,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Speaking Task 2",
      description: "Test speaking task 2",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // 1. Submit with 10 completions
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-07", {
      count: 10,
      mode: "set",
    });

    // 2. Decrease completion count from 10 to 3 (net change: -7)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-07", {
      count: 3,
      mode: "set",
    });

    // Verify user balance after decreasing:
    // XP should be: 100 + 3 * 10 = 130 (lost 70 XP)
    // Points should be: 100 + 3 * 5 = 115 (lost 35 points)
    const updatedUser = await UserModel.findById(user._id).lean();
    expect(updatedUser?.totalXp).toBe(130);
    expect(updatedUser?.pointBalance).toBe(115);

    // Verify negative transactions were created
    const negativeXp = await XpTransactionModel.findOne({
      userId: user._id,
      amount: -70,
      description: `Giảm hoàn thành: ${task.title}`,
    }).lean();
    expect(negativeXp).not.toBeNull();

    const negativePoints = await PointTransactionModel.findOne({
      userId: user._id,
      amount: -35,
      description: `Giảm thưởng nhiệm vụ: ${task.title}`,
    }).lean();
    expect(negativePoints).not.toBeNull();

    // Verify submission record has completionCount = 3
    const submission = await SubmissionModel.findOne({
      date: "2026-07-07",
      subjectUserId: user._id,
      taskId: task._id,
    }).lean();
    expect(submission?.completionCount).toBe(3);
  });

  it("handles the user specific sequence: start 525, set 2, set 1, set 2", async () => {
    const team = await TeamModel.create({
      code: "TEST_TEAM_SUB_3",
      name: "Test Team Sub 3",
    });

    const user = await UserModel.create({
      fullName: "Sub User 3",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 525,
      pointBalance: 525,
      teamId: team._id,
    });

    const task = await TaskModel.create({
      title: "Task 3",
      taskType: "WEEKLY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 10,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "23:59",
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // 1. Set to 2 completions (award 2 * 10 = 20)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-07", {
      count: 2,
      mode: "set",
    });
    let u = await UserModel.findById(user._id).lean();
    expect(u?.pointBalance).toBe(545);

    // 2. Change to 1 completion (deduct 10 points)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-07", {
      count: 1,
      mode: "set",
    });
    u = await UserModel.findById(user._id).lean();
    expect(u?.pointBalance).toBe(535);

    // 3. Change back to 2 completions (award 10 points)
    await saveSubmission(actor, task._id.toString(), user._id.toString(), "2026-07-07", {
      count: 2,
      mode: "set",
    });
    u = await UserModel.findById(user._id).lean();
    expect(u?.pointBalance).toBe(545);

    const txs = await PointTransactionModel.find({ userId: user._id }).lean();
    console.log("Point Transactions: ", txs.map(t => ({ amount: t.amount, source: t.source, desc: t.description })));
    expect(txs.length).toBe(3);
  });
});

