import { NextResponse } from "next/server";

import { getTodayDateKey } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import {
  buildReminderMarkup,
  safeSendTelegramMessage,
} from "@/lib/telegram-bot";
import { safeSendWebPush } from "@/lib/notifications/web-push";
import {
  getReminderCandidates,
  markReminderSent,
  type ReminderRecipient,
} from "@/lib/tasks/reminder-service";

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

  const dateKey = getTodayDateKey();
  const reminders = await getReminderCandidates(dateKey);

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

    await safeSendWebPush(reminder.userId, {
      title: "Nhắc nhiệm vụ",
      body: reminder.text,
      url: `/tasks/${reminder.taskId}`,
      tag: `reminder-${reminder.taskId}`,
    });
  }

  await markReminderSent(dateKey, succeeded);

  return NextResponse.json({
    failed,
    reminderCount: reminders.length,
    sent,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
