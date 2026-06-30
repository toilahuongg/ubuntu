import { getTodayDateKey } from "@/lib/dates";
import { safeSendWebPush } from "@/lib/notifications/web-push";
import {
  buildTelegramStartMarkup,
  safeSendTelegramMessage,
} from "@/lib/telegram-bot";
import {
  deleteInactiveCustomers,
  getCustomerReminderCandidates,
  markCustomerReminderSent,
  type CustomerReminderCandidate,
  type CustomerReminderRecipient,
} from "@/lib/customer/reminder-service";

export type CustomerReminderSweepResult = {
  failed: number;
  pushSent: number;
  reminderCount: number;
  sent: number;
  telegramSent: number;
};

async function deliverCustomerReminderCandidates(
  reminders: CustomerReminderCandidate[],
): Promise<CustomerReminderSweepResult & { succeeded: CustomerReminderRecipient[] }> {
  const succeeded: CustomerReminderRecipient[] = [];
  let failed = 0;
  let pushSent = 0;
  let sent = 0;
  let telegramSent = 0;

  for (const reminder of reminders) {
    let delivered = false;

    if (reminder.chatId !== null) {
      const result = await safeSendTelegramMessage({
        chatId: reminder.chatId,
        replyMarkup: buildTelegramStartMarkup(),
        text: reminder.text,
      });

      if (result.ok) {
        delivered = true;
        telegramSent += 1;
      }
    }

    const pushResult = await safeSendWebPush(reminder.userId, {
      body: reminder.text,
      tag: `customer-reminder-${reminder.customerId}`,
      title: "Nhắc chăm sóc học viên",
      url: `/customers/${reminder.customerId}`,
    });
    pushSent += pushResult.sent;
    if (pushResult.sent > 0) {
      delivered = true;
    }

    if (delivered) {
      sent += 1;
      succeeded.push({
        customerId: reminder.customerId,
        userId: reminder.userId,
      });
    } else {
      failed += 1;
    }
  }

  return {
    failed,
    pushSent,
    reminderCount: reminders.length,
    sent,
    succeeded,
    telegramSent,
  };
}

export async function runCustomerReminderSweep(
  options: { sweepAt?: Date; thresholdDays?: number } = {},
): Promise<
  CustomerReminderSweepResult & {
    dateKey: string;
    inactiveCustomersDeleted: number;
  }
> {
  const sweepAt = options.sweepAt ?? new Date();
  const dateKey = getTodayDateKey(sweepAt);
  const inactiveCustomers = await deleteInactiveCustomers({ sweepAt });
  const reminders = await getCustomerReminderCandidates({
    sweepAt,
    thresholdDays: options.thresholdDays,
  });
  const result = await deliverCustomerReminderCandidates(reminders);
  await markCustomerReminderSent(dateKey, result.succeeded);

  return {
    dateKey,
    failed: result.failed,
    inactiveCustomersDeleted: inactiveCustomers.deletedCount,
    pushSent: result.pushSent,
    reminderCount: result.reminderCount,
    sent: result.sent,
    telegramSent: result.telegramSent,
  };
}
