import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import type { CustomerRecord, UserRecord } from "@/lib/models";
import {
  buildInactiveCustomerDeletionFilter,
  buildCustomerReminderCandidatesFromData,
  buildCustomerReminderText,
  CUSTOMER_REMINDER_THRESHOLD_DAYS,
} from "@/lib/customer/reminder-service";

const ids = {
  customer: new Types.ObjectId(),
  userA: new Types.ObjectId(),
  userB: new Types.ObjectId(),
};

function customer(
  input: Partial<CustomerRecord> & {
    lastInteractionAt?: Date | null;
    createdAt?: Date;
  } = {},
): CustomerRecord {
  return {
    _id: input._id ?? ids.customer,
    ageBracket: "ADULT",
    caregiverIds: input.caregiverIds ?? [ids.userA],
    createdAt: input.createdAt ?? new Date("2026-04-01T00:00:00.000Z"),
    createdBy: ids.userA,
    gender: "male",
    heartStatus: "LEARN_MORE",
    isBaptized: false,
    lastInteractionAt: input.lastInteractionAt ?? null,
    name: input.name ?? "Anh Nam",
    notes: "",
    occupation: "STUDENT",
    personality: "DOER",
    regionId: null,
    teamId: null,
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    zoneId: null,
    ...input,
  } as CustomerRecord;
}

function user(
  input: Partial<UserRecord> & { _id?: Types.ObjectId; telegramId?: number | null } = {},
): UserRecord {
  return {
    _id: input._id ?? ids.userA,
    bio: "",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    email: null,
    fullName: "User A",
    gender: "male",
    image: null,
    lastLoginAt: null,
    level: 1,
    nextLevelXp: 100,
    pointBalance: 0,
    role: "MEMBER",
    status: "ACTIVE",
    teamId: null,
    telegramId: input.telegramId ?? 123456,
    totalXp: 0,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    zoneId: null,
    regionId: null,
    ...input,
  } as UserRecord;
}

describe("customer reminder service", () => {
  it("builds reminder text for customers with no interactions", () => {
    expect(buildCustomerReminderText("Anh Nam", 0)).toContain(
      "chưa có tương tác nào",
    );
  });

  it("builds reminder text with day count", () => {
    expect(buildCustomerReminderText("Chị Lan", 5)).toBe(
      'Nhắc nhở: Học viên "Chị Lan" đã 5 ngày chưa được chăm sóc. Mở app để xem chi tiết.',
    );
  });

  it("returns candidates for customers past threshold", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const lastInteraction = new Date("2026-04-01T10:00:00.000Z"); // 9 days ago

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ lastInteractionAt: lastInteraction })],
      dateKey: "2026-04-10",
      sentLogs: [],
      sweepAt,
      thresholdDays: CUSTOMER_REMINDER_THRESHOLD_DAYS,
      users: [user()],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      chatId: 123456,
      customerId: ids.customer.toString(),
      customerName: "Anh Nam",
      daysSinceLastInteraction: 9,
      userId: ids.userA.toString(),
    });
    expect(candidates[0].text).toContain("9 ngày");
  });

  it("skips customers within threshold", () => {
    const sweepAt = new Date("2026-04-05T10:00:00.000Z");
    const lastInteraction = new Date("2026-04-03T10:00:00.000Z"); // 2 days ago

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ lastInteractionAt: lastInteraction })],
      dateKey: "2026-04-05",
      sentLogs: [],
      sweepAt,
      thresholdDays: 3,
      users: [user()],
    });

    expect(candidates).toHaveLength(0);
  });

  it("skips already sent reminders", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const lastInteraction = new Date("2026-04-01T10:00:00.000Z");

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ lastInteractionAt: lastInteraction })],
      dateKey: "2026-04-10",
      sentLogs: [
        {
          customerId: ids.customer,
          userId: ids.userA,
        },
      ],
      sweepAt,
      thresholdDays: 3,
      users: [user()],
    });

    expect(candidates).toHaveLength(0);
  });

  it("notifies multiple caregivers", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const lastInteraction = new Date("2026-04-01T10:00:00.000Z");

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [
        customer({
          caregiverIds: [ids.userA, ids.userB],
          lastInteractionAt: lastInteraction,
        }),
      ],
      dateKey: "2026-04-10",
      sentLogs: [],
      sweepAt,
      thresholdDays: 3,
      users: [
        user({ _id: ids.userA, telegramId: 111 }),
        user({ _id: ids.userB, telegramId: 222 }),
      ],
    });

    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.userId)).toContain(ids.userA.toString());
    expect(candidates.map((c) => c.userId)).toContain(ids.userB.toString());
  });

  it("skips inactive caregivers", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const lastInteraction = new Date("2026-04-01T10:00:00.000Z");

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ lastInteractionAt: lastInteraction })],
      dateKey: "2026-04-10",
      sentLogs: [],
      sweepAt,
      thresholdDays: 3,
      users: [user({ status: "INACTIVE" })],
    });

    expect(candidates).toHaveLength(0);
  });

  it("uses createdAt as fallback when no lastInteractionAt", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const createdAt = new Date("2026-04-01T10:00:00.000Z");

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ createdAt, lastInteractionAt: null })],
      dateKey: "2026-04-10",
      sentLogs: [],
      sweepAt,
      thresholdDays: 3,
      users: [user()],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].daysSinceLastInteraction).toBe(9);
  });

  it("skips customers inactive for more than 30 days", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const lastInteraction = new Date("2026-03-05T10:00:00.000Z"); // 36 days ago

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ lastInteractionAt: lastInteraction })],
      dateKey: "2026-04-10",
      sentLogs: [],
      sweepAt,
      thresholdDays: 3,
      users: [user()],
    });

    expect(candidates).toHaveLength(0);
  });

  it("skips customers inactive for exactly 30 days", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const lastInteraction = new Date("2026-03-11T10:00:00.000Z"); // 30 days ago

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ lastInteractionAt: lastInteraction })],
      dateKey: "2026-04-10",
      sentLogs: [],
      sweepAt,
      thresholdDays: 3,
      users: [user()],
    });

    expect(candidates).toHaveLength(0);
  });

  it("skips customers created more than 30 days ago with no interactions", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const createdAt = new Date("2026-03-05T10:00:00.000Z"); // 36 days ago

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ createdAt, lastInteractionAt: null })],
      dateKey: "2026-04-10",
      sentLogs: [],
      sweepAt,
      thresholdDays: 3,
      users: [user()],
    });

    expect(candidates).toHaveLength(0);
  });

  it("builds deletion filter for customers inactive for 30 days", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const cutoff = new Date("2026-03-11T10:00:00.000Z");

    expect(buildInactiveCustomerDeletionFilter(sweepAt)).toEqual({
      $or: [
        {
          lastInteractionAt: {
            $ne: null,
            $lte: cutoff,
          },
        },
        {
          $or: [
            { lastInteractionAt: null },
            { lastInteractionAt: { $exists: false } },
          ],
          createdAt: { $lte: cutoff },
        },
      ],
    });
  });
});
