import "server-only";

import { connectToDatabase } from "@/lib/mongoose";
import {
  RegionModel,
  type RegionRecord,
  TeamModel,
  type TeamRecord,
  ZoneModel,
  type ZoneRecord,
} from "@/lib/models";
import { safeSendTelegramMessage } from "@/lib/telegram-bot";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatGroupSubmissionMessage(input: {
  fullName: string;
  taskTitle: string;
  xpAwarded: number;
}): string {
  const name = escapeHtml(input.fullName);
  const title = escapeHtml(input.taskTitle);
  const xp = Math.max(0, Math.floor(input.xpAwarded));
  return `📌 <b>${name}</b> vừa hoàn thành <b>${title}</b> (+${xp} XP)`;
}

export async function notifySubmissionToGroups(input: {
  subject: {
    fullName: string;
    teamId?: string | null;
    zoneId?: string | null;
    regionId?: string | null;
  };
  taskTitle: string;
  xpAwarded: number;
}): Promise<void> {
  await connectToDatabase();

  const [team, zone, region] = await Promise.all([
    input.subject.teamId
      ? (TeamModel.findById(input.subject.teamId)
          .select({ telegramChatId: 1 })
          .lean() as Promise<TeamRecord | null>)
      : null,
    input.subject.zoneId
      ? (ZoneModel.findById(input.subject.zoneId)
          .select({ telegramChatId: 1 })
          .lean() as Promise<ZoneRecord | null>)
      : null,
    input.subject.regionId
      ? (RegionModel.findById(input.subject.regionId)
          .select({ telegramChatId: 1 })
          .lean() as Promise<RegionRecord | null>)
      : null,
  ]);

  const chatIds = new Set<number>();
  for (const entity of [team, zone, region]) {
    const chatId = (entity as { telegramChatId?: number | null } | null)
      ?.telegramChatId;
    if (typeof chatId === "number") {
      chatIds.add(chatId);
    }
  }

  if (chatIds.size === 0) return;

  const text = formatGroupSubmissionMessage({
    fullName: input.subject.fullName,
    taskTitle: input.taskTitle,
    xpAwarded: input.xpAwarded,
  });

  await Promise.allSettled(
    Array.from(chatIds).map((chatId) =>
      safeSendTelegramMessage({ chatId, parseMode: "HTML", text }),
    ),
  );
}
