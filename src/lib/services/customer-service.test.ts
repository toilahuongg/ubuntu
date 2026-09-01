import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createCustomer, updateCustomer } from "./customer-service";
import {
  CustomerModel,
  PointTransactionModel,
  TeamModel,
  UserModel,
  XpTransactionModel,
} from "../models";
import { connectToDatabase } from "../mongoose";
import { createInteraction } from "./customer-interaction-service";
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

function toSession(
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string; status: string; teamId: mongoose.Types.ObjectId | null },
): SessionUser {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    role: user.role as SessionUser["role"],
    status: user.status as SessionUser["status"],
    teamId: user.teamId ? user.teamId.toString() : null,
  };
}

let teamCounter = 0;

async function seedLeadAndCaregivers() {
  teamCounter += 1;
  const team = await TeamModel.create({
    code: `TEST-TEAM-${teamCounter}`,
    name: "Team A",
  });
  const lead = await UserModel.create({
    fullName: "Lead",
    role: "TEAM_LEAD",
    status: "ACTIVE",
    teamId: team._id,
  });
  const caregiver1 = await UserModel.create({
    fullName: "Caregiver 1",
    role: "MEMBER",
    status: "ACTIVE",
    teamId: team._id,
  });
  const caregiver2 = await UserModel.create({
    fullName: "Caregiver 2",
    role: "MEMBER",
    status: "ACTIVE",
    teamId: team._id,
  });
  return { team, lead, caregiver1, caregiver2 };
}

const baseInput = {
  ageBracket: "20_TO_25" as const,
  gender: "male" as const,
  occupation: "STUDENT" as const,
  personality: "EXTROVERT" as const,
  notes: "",
  caregiverIds: [] as string[],
};

async function phoneTransactionsFor(customerId: string) {
  return PointTransactionModel.find({
    source: "new_customer_reward",
    sourceId: new mongoose.Types.ObjectId(customerId),
  })
    .lean();
}

describe("createCustomer phone rewards", () => {
  it("awards +5 points to each assigned caregiver for a new phone", async () => {
    const { lead, caregiver1, caregiver2 } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      {
        ...baseInput,
        name: "Học viên A",
        phone: "0912345678",
        caregiverIds: [caregiver1._id.toString(), caregiver2._id.toString()],
      },
      toSession(lead),
    );

    expect(customer.phone).toBe("0912345678");

    const transactions = await phoneTransactionsFor(customer.id);
    expect(transactions).toHaveLength(2);
    for (const tx of transactions) {
      expect(tx.amount).toBe(5);
      expect(tx.source).toBe("new_customer_reward");
      expect(tx.description).toBe("SĐT mới: Học viên A");
    }
    const recipientIds = transactions.map((tx) => tx.userId.toString()).sort();
    expect(recipientIds).toEqual(
      [caregiver1._id.toString(), caregiver2._id.toString()].sort(),
    );

    const cg1 = await UserModel.findById(caregiver1._id).lean();
    const cg2 = await UserModel.findById(caregiver2._id).lean();
    expect(cg1?.pointBalance).toBe(5);
    expect(cg2?.pointBalance).toBe(5);
    expect(cg1?.totalXp).toBe(0);
  });

  it("falls back to the creator when no caregiver is assigned", async () => {
    const { lead } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      { ...baseInput, name: "Học viên B", phone: "0987654321" },
      toSession(lead),
    );

    const transactions = await phoneTransactionsFor(customer.id);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.userId.toString()).toBe(lead._id.toString());

    const leadAfter = await UserModel.findById(lead._id).lean();
    expect(leadAfter?.pointBalance).toBe(5);
  });

  it("rejects a duplicate phone without creating the customer", async () => {
    const { lead } = await seedLeadAndCaregivers();

    await createCustomer(
      { ...baseInput, name: "Học viên C", phone: "0900111222" },
      toSession(lead),
    );

    await expect(
      createCustomer(
        { ...baseInput, name: "Học viên D", phone: "0900-111-222" },
        toSession(lead),
      ),
    ).rejects.toThrow("SĐT đã tồn tại.");

    const count = await CustomerModel.countDocuments({ name: "Học viên D" });
    expect(count).toBe(0);
  });

  it("creates a customer without phone and awards nothing", async () => {
    const { lead } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      { ...baseInput, name: "Học viên E" },
      toSession(lead),
    );

    expect(customer.phone).toBeNull();
    expect(await phoneTransactionsFor(customer.id)).toHaveLength(0);

    const leadAfter = await UserModel.findById(lead._id).lean();
    expect(leadAfter?.pointBalance).toBe(0);
  });

  it("normalizes phone digits before storing", async () => {
    const { lead } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      { ...baseInput, name: "Học viên F", phone: "+84 (0) 91-234-567" },
      toSession(lead),
    );

    expect(customer.phone).toBe("84091234567");
  });
});

describe("updateCustomer phone rules", () => {
  it("rejects setting a phone that already belongs to another customer", async () => {
    const { lead } = await seedLeadAndCaregivers();

    const first = await createCustomer(
      { ...baseInput, name: "Học viên G", phone: "0911111111" },
      toSession(lead),
    );
    const second = await createCustomer(
      { ...baseInput, name: "Học viên H" },
      toSession(lead),
    );

    await expect(
      updateCustomer(second.id, { phone: "0911-111-111" }, toSession(lead)),
    ).rejects.toThrow("SĐT đã tồn tại.");

    const after = await CustomerModel.findById(second.id).lean();
    expect(after?.phone).toBeNull();
    // Không phát sinh thêm điểm cho SĐT cũ
    const firstTxs = await phoneTransactionsFor(first.id);
    expect(firstTxs).toHaveLength(1);
  });

  it("moves the phone reward to the new caregiver set on change", async () => {
    const { lead, caregiver1 } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      { ...baseInput, name: "Học viên I", phone: "0922222222" },
      toSession(lead),
    );

    const before = await phoneTransactionsFor(customer.id);
    expect(before).toHaveLength(1); // lead +5 lúc tạo

    await updateCustomer(
      customer.id,
      { caregiverIds: [caregiver1._id.toString()] },
      toSession(lead),
    );

    const after = await phoneTransactionsFor(customer.id);
    expect(after).toHaveLength(3); // +5 lead (lúc tạo), -5 lead (thu hồi), +5 caregiver1
    const reversal = after.find((tx) => tx.amount < 0);
    expect(reversal?.description).toBe("Thu hồi SĐT mới: Học viên I");

    const leadAfter = await UserModel.findById(lead._id).lean();
    expect(leadAfter?.pointBalance).toBe(0);
    const cg1 = await UserModel.findById(caregiver1._id).lean();
    expect(cg1?.pointBalance).toBe(5);
  });

  it("clears the phone when updated to an empty value", async () => {
    const { lead } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      { ...baseInput, name: "Học viên K", phone: "0933333333" },
      toSession(lead),
    );

    const updated = await updateCustomer(
      customer.id,
      { phone: "" },
      toSession(lead),
    );

    expect(updated.phone).toBeNull();
  });
});

describe("resync rewards on caregiver change", () => {
  it("moves interaction points and XP to the new caregiver set", async () => {
    const { lead, caregiver1, caregiver2 } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      {
        ...baseInput,
        name: "Học viên L",
        caregiverIds: [caregiver1._id.toString()],
      },
      toSession(lead),
    );

    await createInteraction(
      {
        customerId: customer.id,
        type: "MESSAGE",
        outcome: "SIMPLE",
        notes: "",
      },
      toSession(caregiver1),
    );

    const cg1Before = await UserModel.findById(caregiver1._id).lean();
    expect(cg1Before?.pointBalance).toBe(50);
    expect(cg1Before?.totalXp).toBe(50);

    await updateCustomer(
      customer.id,
      { caregiverIds: [caregiver2._id.toString()] },
      toSession(lead),
    );

    const cg1After = await UserModel.findById(caregiver1._id).lean();
    expect(cg1After?.pointBalance).toBe(0);
    expect(cg1After?.totalXp).toBe(0);

    const cg2After = await UserModel.findById(caregiver2._id).lean();
    expect(cg2After?.pointBalance).toBe(50);
    expect(cg2After?.totalXp).toBe(50);

    const adjustmentTxs = await PointTransactionModel.find({
      source: "customer_interaction_reward",
      description: "Điều chỉnh chăm sóc: Học viên L",
    }).lean();
    expect(adjustmentTxs).toHaveLength(2);
    expect(adjustmentTxs.map((tx) => tx.amount).sort()).toEqual([-50, 50]);

    const xpAdjustments = await XpTransactionModel.find({
      source: "customer_interaction",
      description: "Điều chỉnh chăm sóc: Học viên L",
    }).lean();
    expect(xpAdjustments.map((tx) => tx.amount).sort()).toEqual([-50, 50]);
  });

  it("keeps interaction rewards with the author when the customer has no caregivers", async () => {
    const { lead, caregiver1 } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      { ...baseInput, name: "Học viên M" },
      toSession(lead),
    );

    await createInteraction(
      {
        customerId: customer.id,
        type: "CALL",
        outcome: "SIMPLE",
        notes: "",
      },
      toSession(lead),
    );

    const leadBefore = await UserModel.findById(lead._id).lean();
    expect(leadBefore?.pointBalance).toBe(50);

    await updateCustomer(
      customer.id,
      { caregiverIds: [caregiver1._id.toString()] },
      toSession(lead),
    );

    const leadAfter = await UserModel.findById(lead._id).lean();
    expect(leadAfter?.pointBalance).toBe(0);
    const cg1 = await UserModel.findById(caregiver1._id).lean();
    expect(cg1?.pointBalance).toBe(50);

    // Không có SĐT → không phát sinh điều chỉnh SĐT
    const phoneTxs = await phoneTransactionsFor(customer.id);
    expect(phoneTxs).toHaveLength(0);
  });

  it("does not create adjustments when the caregiver set is unchanged", async () => {
    const { lead, caregiver1 } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      {
        ...baseInput,
        name: "Học viên N",
        phone: "0944444444",
        caregiverIds: [caregiver1._id.toString()],
      },
      toSession(lead),
    );

    const before = await phoneTransactionsFor(customer.id);
    expect(before).toHaveLength(1);

    await updateCustomer(
      customer.id,
      { caregiverIds: [caregiver1._id.toString()] },
      toSession(lead),
    );

    const after = await phoneTransactionsFor(customer.id);
    expect(after).toHaveLength(1);
  });
});
