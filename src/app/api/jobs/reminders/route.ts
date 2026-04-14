import { NextResponse } from "next/server";

import { getTodayDateKey } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import {
  buildReminderMarkup,
  safeSendTelegramMessage,
} from "@/lib/telegram-bot";
import {
  getReminderCandidates,
  markReminderSent,
} from "@/lib/services/task-service";

function isAuthorized(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  return secret && secret === requireEnv("CRON_SECRET");
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  const reminders = await getReminderCandidates(getTodayDateKey());

  // Track per-occurrence send outcomes so we only mark an occurrence as
  // "reminded" when at least one recipient got the message — otherwise a
  // single blocked user could mask the whole batch.
  const perOccurrence = new Map<string, { attempted: number; succeeded: number }>();
  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    const stats =
      perOccurrence.get(reminder.occurrenceId) ??
      { attempted: 0, succeeded: 0 };
    stats.attempted += 1;

    const result = await safeSendTelegramMessage({
      chatId: reminder.chatId,
      replyMarkup: buildReminderMarkup(reminder.occurrenceId),
      text: reminder.text,
    });

    if (result.ok) {
      stats.succeeded += 1;
      sent += 1;
    } else {
      failed += 1;
    }

    perOccurrence.set(reminder.occurrenceId, stats);
  }

  const succeededOccurrenceIds = [...perOccurrence.entries()]
    .filter(([, stats]) => stats.succeeded > 0)
    .map(([occurrenceId]) => occurrenceId);

  await markReminderSent(succeededOccurrenceIds);

  return NextResponse.json({
    failed,
    reminderCount: reminders.length,
    sent,
  });
}
