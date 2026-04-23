import { getCurrentYearMonth, getTodayDateKey } from "@/lib/dates";
import { safeSendWebPush } from "@/lib/notifications/web-push";
import {
  buildReminderMarkup,
  safeSendTelegramMessage,
} from "@/lib/telegram-bot";
import {
  getDueMonthlyGoalReminderCandidates,
  getReminderCandidates,
  markMonthlyGoalReminderSent,
  markReminderSent,
  type ReminderCandidate,
  type ReminderRecipient,
} from "@/lib/tasks/reminder-service";

export type ReminderSweepResult = {
  failed: number;
  pushSent: number;
  reminderCount: number;
  sent: number;
  telegramSent: number;
};

async function deliverReminderCandidates(
  reminders: ReminderCandidate[],
  options: { tagPrefix: string; title: string },
): Promise<ReminderSweepResult & { succeeded: ReminderRecipient[] }> {
  const succeeded: ReminderRecipient[] = [];
  let failed = 0;
  let pushSent = 0;
  let sent = 0;
  let telegramSent = 0;

  for (const reminder of reminders) {
    let delivered = false;

    if (reminder.chatId !== null) {
      const result = await safeSendTelegramMessage({
        chatId: reminder.chatId,
        replyMarkup: buildReminderMarkup(reminder.taskId),
        text: reminder.text,
      });

      if (result.ok) {
        delivered = true;
        telegramSent += 1;
      }
    }

    const pushResult = await safeSendWebPush(reminder.userId, {
      body: reminder.text,
      tag: `${options.tagPrefix}-${reminder.taskId}`,
      title: options.title,
      url: `/tasks/${reminder.taskId}`,
    });
    pushSent += pushResult.sent;
    if (pushResult.sent > 0) {
      delivered = true;
    }

    if (delivered) {
      sent += 1;
      succeeded.push({ taskId: reminder.taskId, userId: reminder.userId });
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

export async function runDailyReminderSweep(
  options: { sweepAt?: Date; windowMinutes?: number } = {},
): Promise<ReminderSweepResult & { dateKey: string }> {
  const sweepAt = options.sweepAt ?? new Date();
  const dateKey = getTodayDateKey(sweepAt);
  const reminders = await getReminderCandidates(dateKey, {
    sweepAt,
    windowMinutes: options.windowMinutes,
  });
  const result = await deliverReminderCandidates(reminders, {
    tagPrefix: "reminder",
    title: "Nhắc nhiệm vụ",
  });
  await markReminderSent(dateKey, result.succeeded);

  return {
    dateKey,
    failed: result.failed,
    pushSent: result.pushSent,
    reminderCount: result.reminderCount,
    sent: result.sent,
    telegramSent: result.telegramSent,
  };
}

export async function runMonthlyGoalReminderSweep(
  options: { sweepAt?: Date; windowMinutes?: number } = {},
): Promise<ReminderSweepResult & { yearMonth: string }> {
  const sweepAt = options.sweepAt ?? new Date();
  const yearMonth = getCurrentYearMonth(sweepAt);
  const reminders = await getDueMonthlyGoalReminderCandidates({
    sweepAt,
    windowMinutes: options.windowMinutes,
  });
  const result = await deliverReminderCandidates(reminders, {
    tagPrefix: "monthly-goal-reminder",
    title: "Nhắc mục tiêu tháng",
  });
  await markMonthlyGoalReminderSent(yearMonth, result.succeeded);

  return {
    failed: result.failed,
    pushSent: result.pushSent,
    reminderCount: result.reminderCount,
    sent: result.sent,
    telegramSent: result.telegramSent,
    yearMonth,
  };
}
