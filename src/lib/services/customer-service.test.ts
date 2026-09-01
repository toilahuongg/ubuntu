import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createCustomer, updateCustomer } from "./customer-service";
import {
  CustomerModel,
  PointTransactionModel,
  TeamModel,
  UserModel,
} from "../models";
import type { SessionUser } from "../domain";
import { connectToDatabase } from "../mongoose";

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

  it("does not award retroactive points when adding caregivers later", async () => {
    const { lead, caregiver1 } = await seedLeadAndCaregivers();

    const customer = await createCustomer(
      { ...baseInput, name: "Học viên I", phone: "0922222222" },
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

    const cg1 = await UserModel.findById(caregiver1._id).lean();
    expect(cg1?.pointBalance).toBe(0);
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
