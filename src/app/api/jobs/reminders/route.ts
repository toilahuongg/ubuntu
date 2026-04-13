import { NextResponse } from "next/server";

import { getTodayDateKey } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { getReminderCandidates, markReminderSent } from "@/lib/services/task-service";

function isAuthorized(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  return secret && secret === requireEnv("CRON_SECRET");
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const reminders = await getReminderCandidates(getTodayDateKey());

  for (const reminder of reminders) {
    await sendTelegramMessage({
      chatId: reminder.chatId,
      text: reminder.text,
    });
  }

  await markReminderSent([...new Set(reminders.map((reminder) => reminder.occurrenceId))]);

  return NextResponse.json({
    reminderCount: reminders.length,
  });
}
