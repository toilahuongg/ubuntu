import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/notifications/submission-notifier", () => ({
  notifySubmissionToGroups: vi.fn().mockResolvedValue(undefined),
  notifyTaskCompletionToGroups: vi.fn().mockResolvedValue(undefined),
}));

// Ghim "hôm nay" về 2026-07-07 để bộ dates hardcode trong test nằm trong cửa sổ
// nhập bù và trong cùng tháng (chuỗi streak reset theo tháng).
vi.mock("@/lib/dates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dates")>();
  return {
    ...actual,
    getTodayDateKey: () => "2026-07-07",
  };
});

import { saveSubmission } from "./submission-service";
import { UserModel, TaskModel, TeamModel, PointTransactionModel, XpTransactionModel } from "../models";
import { connectToDatabase } from "../mongoose";
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

  await connectToDatabase();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("streak points verification", () => {
  it("rewards streak bonus points correctly when a streak milestone is hit", async () => {
    // 0. Create a test team
    const team = await TeamModel.create({
      code: "TEST_TEAM",
      name: "Test Team",
    });

    // 1. Create a test user associated with team
    const user = await UserModel.create({
      fullName: "Test User",
      role: "MEMBER",
      status: "ACTIVE",
      totalXp: 0,
      pointBalance: 0,
      teamId: team._id,
    });

    // 2. Create a test task (DAILY_PER_MEMBER)
    const task = await TaskModel.create({
      title: "Daily Task",
      description: "Test daily task",
      taskType: "DAILY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      expReward: 10,
      pointReward: 5,
      isActive: true,
      targetRoles: ["MEMBER"],
      scope: "TEAM",
      teamId: team._id,
      createdBy: user._id,
      deadlineTime: "22:00",
    });

    const actor: SessionUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      teamId: team._id.toString(),
    };

    // We will submit for 7 consecutive days: 2026-07-01 to 2026-07-07
    const dates = [
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
    ];

    // Submit for the first 6 days
    for (let i = 0; i < 6; i++) {
      const result = await saveSubmission(actor, task._id.toString(), user._id.toString(), dates[i]);
      expect(result.streakBonus.awarded).toBe(false);
      expect(result.streakBonus.streakLength).toBe(i + 1);
    }

    // Verify pointBalance before the 7th day (should be 6 days * 5 points = 30 points)
    const userAfter6 = await UserModel.findById(user._id).lean();
    expect(userAfter6?.pointBalance).toBe(30);

    // Verify point transactions count: should be 6 completion transactions, 0 streak bonus transactions
    const transactionsBefore = await PointTransactionModel.find({ userId: user._id }).lean();
    expect(transactionsBefore.length).toBe(6);
    expect(transactionsBefore.filter(t => t.source === "task_streak_bonus_reward").length).toBe(0);

    // Submit for the 7th day (milestone 7)
    const result7 = await saveSubmission(actor, task._id.toString(), user._id.toString(), dates[6]);

    // Verify streak bonus response
    expect(result7.streakBonus.awarded).toBe(true);
    expect(result7.streakBonus.milestone).toBe(7);
    expect(result7.streakBonus.bonusPoints).toBe(2); // floor(5 * 0.5) for 7-day milestone
    expect(result7.streakBonus.bonusExp).toBe(5); // floor(10 * 0.5) = 5

    // Verify user pointBalance after 7th day:
    // Should be 30 + 5 (base reward) + 2 (streak bonus reward) = 37 points
    const userAfter7 = await UserModel.findById(user._id).lean();
    expect(userAfter7?.pointBalance).toBe(37);
    expect(userAfter7?.totalXp).toBe(75); // 6 * 10 (base exp) + 10 (7th base) + 5 (7th bonus) = 75

    // Verify PointTransactionModel for streak bonus
    const bonusTransaction = await PointTransactionModel.findOne({
      userId: user._id,
      source: "task_streak_bonus_reward",
    }).lean();
    expect(bonusTransaction).not.toBeNull();
    expect(bonusTransaction?.amount).toBe(2);
    expect(bonusTransaction?.description).toContain("Thưởng chuỗi 7 ngày");

    // Verify XpTransactionModel for streak bonus
    const xpBonusTransaction = await XpTransactionModel.findOne({
      userId: user._id,
      source: "task_streak_bonus",
    }).lean();
    expect(xpBonusTransaction).not.toBeNull();
    expect(xpBonusTransaction?.amount).toBe(5);
  });
});
