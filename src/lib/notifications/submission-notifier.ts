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

function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? escapeHtml(String(vars[key])) : `{${key}}`,
  );
}

export function formatGroupSubmissionMessage(input: {
  fullName: string;
  taskTitle: string;
  xpAwarded: number;
  completionCount: number;
  template?: string;
}): string {
  if (input.template) {
    return renderTemplate(input.template, {
      name: input.fullName,
      task: input.taskTitle,
      xp: Math.max(0, Math.floor(input.xpAwarded)),
      count: input.completionCount,
    });
  }
  const name = escapeHtml(input.fullName);
  const title = escapeHtml(input.taskTitle);
  const xp = Math.max(0, Math.floor(input.xpAwarded));
  const countSuffix =
    input.completionCount > 1 ? ` (×${input.completionCount})` : "";
  const xpSuffix = xp > 0 ? ` (+${xp} XP)` : "";
  return `📌 <b>${name}</b> vừa hoàn thành <b>${title}</b>${countSuffix}${xpSuffix}`;
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
  completionCount: number;
  template?: string;
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
    completionCount: input.completionCount,
    template: input.template,
  });

  await Promise.allSettled(
    Array.from(chatIds).map((chatId) =>
      safeSendTelegramMessage({ chatId, parseMode: "HTML", text }),
    ),
  );
}

export async function notifyTaskCompletionToGroups(input: {
  scope: {
    teamId?: string | null;
    zoneId?: string | null;
    regionId?: string | null;
  };
  taskTitle: string;
  targetCount: number;
  template?: string;
}): Promise<void> {
  await connectToDatabase();

  const [team, zone, region] = await Promise.all([
    input.scope.teamId
      ? (TeamModel.findById(input.scope.teamId)
          .select({ telegramChatId: 1 })
          .lean() as Promise<TeamRecord | null>)
      : null,
    input.scope.zoneId
      ? (ZoneModel.findById(input.scope.zoneId)
          .select({ telegramChatId: 1 })
          .lean() as Promise<ZoneRecord | null>)
      : null,
    input.scope.regionId
      ? (RegionModel.findById(input.scope.regionId)
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

  const text = input.template
    ? renderTemplate(input.template, {
        task: input.taskTitle,
        target: input.targetCount,
      })
    : `🏆 Nhiệm vụ <b>${escapeHtml(input.taskTitle)}</b> đã hoàn thành mục tiêu ${input.targetCount}!`;

  await Promise.allSettled(
    Array.from(chatIds).map((chatId) =>
      safeSendTelegramMessage({ chatId, parseMode: "HTML", text }),
    ),
  );
}
