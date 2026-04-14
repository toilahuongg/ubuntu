import { NextResponse } from "next/server";

import { getCurrentYearMonth, getTodayDateKey } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import {
  buildReminderMarkup,
  safeSendTelegramMessage,
} from "@/lib/telegram-bot";
import {
  getMonthlyGoalReminderCandidates,
  markMonthlyGoalReminderSent,
  type ReminderRecipient,
} from "@/lib/tasks/reminder-service";

const REMINDER_WINDOW_DAYS = 5;

function isAuthorized(request: Request) {
  if (request.headers.get("x-vercel-cron")) return true;
  const secret = request.headers.get("x-cron-secret");
  return !!secret && secret === requireEnv("CRON_SECRET");
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  const yearMonth = getCurrentYearMonth();
  const dayOfMonth = Number.parseInt(getTodayDateKey().slice(8, 10), 10);

  if (dayOfMonth > REMINDER_WINDOW_DAYS) {
    return NextResponse.json({
      skipped: true,
      reason: "outside-window",
      yearMonth,
      dayOfMonth,
    });
  }

  const reminders = await getMonthlyGoalReminderCandidates(yearMonth);

  const succeeded: ReminderRecipient[] = [];
  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    const result = await safeSendTelegramMessage({
      chatId: reminder.chatId,
      replyMarkup: buildReminderMarkup(reminder.taskId),
      text: reminder.text,
    });

    if (result.ok) {
      sent += 1;
      succeeded.push({ taskId: reminder.taskId, userId: reminder.userId });
    } else {
      failed += 1;
    }
  }

  await markMonthlyGoalReminderSent(yearMonth, succeeded);

  return NextResponse.json({
    failed,
    reminderCount: reminders.length,
    sent,
    yearMonth,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
