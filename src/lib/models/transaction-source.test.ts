import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import {
  PointTransactionModel,
  POINT_SOURCES,
} from "@/lib/models/point-transaction";
import {
  XpTransactionModel,
  XP_SOURCES,
} from "@/lib/models/xp-transaction";

describe("transaction source enums", () => {
  it("accepts customer interaction XP transactions", async () => {
    const transaction = new XpTransactionModel({
      amount: 5,
      source: "customer_interaction",
      sourceId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
    });

    await expect(transaction.validate()).resolves.toBeUndefined();
    expect(XP_SOURCES).toContain("customer_interaction");
  });

  it("accepts task streak bonus XP transactions", async () => {
    const transaction = new XpTransactionModel({
      amount: 20,
      source: "task_streak_bonus",
      sourceId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
    });

    await expect(transaction.validate()).resolves.toBeUndefined();
    expect(XP_SOURCES).toContain("task_streak_bonus");
  });

  it("accepts customer interaction point transactions", async () => {
    const transaction = new PointTransactionModel({
      amount: 5,
      source: "customer_interaction_reward",
      sourceId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
    });

    await expect(transaction.validate()).resolves.toBeUndefined();
    expect(POINT_SOURCES).toContain("customer_interaction_reward");
  });

  it("accepts task streak bonus point transactions", async () => {
    const transaction = new PointTransactionModel({
      amount: 20,
      source: "task_streak_bonus_reward",
      sourceId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
    });

    await expect(transaction.validate()).resolves.toBeUndefined();
    expect(POINT_SOURCES).toContain("task_streak_bonus_reward");
  });
});
