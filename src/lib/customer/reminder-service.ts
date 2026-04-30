import { getTodayDateKey } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  CustomerModel,
  CustomerReminderLogModel,
  UserModel,
  type CustomerRecord,
  type UserRecord,
} from "@/lib/models";

export const CUSTOMER_REMINDER_THRESHOLD_DAYS = 3;

export type CustomerReminderCandidate = {
  chatId: number | null;
  customerId: string;
  customerName: string;
  daysSinceLastInteraction: number;
  text: string;
  userId: string;
};

export type CustomerReminderRecipient = {
  customerId: string;
  userId: string;
};

export function buildCustomerReminderText(
  customerName: string,
  daysSinceLastInteraction: number,
): string {
  if (daysSinceLastInteraction === 0) {
    return `Nhắc nhở: Học viên "${customerName}" chưa có tương tác nào. Hãy chăm sóc ngay nhé.`;
  }
  return `Nhắc nhở: Học viên "${customerName}" đã ${daysSinceLastInteraction} ngày chưa được chăm sóc. Mở app để xem chi tiết.`;
}

export function buildCustomerReminderCandidatesFromData(input: {
  customers: CustomerRecord[];
  dateKey: string;
  sentLogs: { customerId: unknown; userId: unknown }[];
  sweepAt: Date;
  thresholdDays?: number;
  users: UserRecord[];
}): CustomerReminderCandidate[] {
  const threshold = input.thresholdDays ?? CUSTOMER_REMINDER_THRESHOLD_DAYS;
  const sweepTime = input.sweepAt.getTime();

  const sentPairs = new Set(
    input.sentLogs.map(
      (log) => `${String(log.customerId)}:${String(log.userId)}`,
    ),
  );

  const userById = new Map(
    input.users.map((user) => [user._id.toString(), user]),
  );

  const candidates: CustomerReminderCandidate[] = [];

  for (const customer of input.customers) {
    const customerId = customer._id.toString();
    const lastInteractionTime = customer.lastInteractionAt
      ? new Date(customer.lastInteractionAt).getTime()
      : new Date(customer.createdAt).getTime();

    const daysSince = Math.floor(
      (sweepTime - lastInteractionTime) / (1000 * 60 * 60 * 24),
    );

    if (daysSince < threshold) continue;

    const caregiverIds = (customer.caregiverIds ?? []).map((id) =>
      id.toString(),
    );

    for (const caregiverId of caregiverIds) {
      const pairKey = `${customerId}:${caregiverId}`;
      if (sentPairs.has(pairKey)) continue;

      const user = userById.get(caregiverId);
      if (!user || user.status !== "ACTIVE") continue;

      candidates.push({
        chatId: user.telegramId ?? null,
        customerId,
        customerName: customer.name,
        daysSinceLastInteraction: daysSince,
        text: buildCustomerReminderText(customer.name, daysSince),
        userId: caregiverId,
      });
    }
  }

  return candidates;
}

export async function getCustomerReminderCandidates(
  options: {
    sweepAt?: Date;
    thresholdDays?: number;
  } = {},
): Promise<CustomerReminderCandidate[]> {
  await connectToDatabase();

  const sweepAt = options.sweepAt ?? new Date();
  const dateKey = getTodayDateKey(sweepAt);
  const threshold = options.thresholdDays ?? CUSTOMER_REMINDER_THRESHOLD_DAYS;

  const thresholdDate = new Date(sweepAt);
  thresholdDate.setDate(thresholdDate.getDate() - threshold);

  const customers = (await CustomerModel.find({
    $or: [
      { lastInteractionAt: { $lte: thresholdDate } },
      { lastInteractionAt: { $exists: false } },
    ],
  }).lean()) as CustomerRecord[];

  if (customers.length === 0) return [];

  const caregiverIds = Array.from(
    new Set(
      customers.flatMap((c) =>
        (c.caregiverIds ?? []).map((id) => id.toString()),
      ),
    ),
  );

  if (caregiverIds.length === 0) return [];

  const users = (await UserModel.find({
    _id: { $in: caregiverIds },
    status: "ACTIVE",
  }).lean()) as UserRecord[];

  if (users.length === 0) return [];

  const sentLogs = (await CustomerReminderLogModel.find({
    date: dateKey,
  }).lean()) as { customerId: unknown; userId: unknown }[];

  return buildCustomerReminderCandidatesFromData({
    customers,
    dateKey,
    sentLogs,
    sweepAt,
    thresholdDays: threshold,
    users,
  });
}

export async function markCustomerReminderSent(
  dateKey: string,
  recipients: CustomerReminderRecipient[],
): Promise<void> {
  if (recipients.length === 0) return;
  await connectToDatabase();
  await CustomerReminderLogModel.bulkWrite(
    recipients.map(({ customerId, userId }) => ({
      updateOne: {
        filter: {
          customerId,
          date: dateKey,
          userId,
        },
        update: {
          $setOnInsert: {
            customerId,
            date: dateKey,
            sentAt: new Date(),
            userId,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}
