import "server-only";

import { connectToDatabase } from "@/lib/mongoose";
import {
  RegionModel,
  TeamModel,
  TelegramPendingGroupModel,
  type TelegramPendingGroupRecord,
  ZoneModel,
} from "@/lib/models";
import { toObjectId } from "@/lib/utils/ids";

export type TelegramBindingLevel = "region" | "zone" | "team";

export type PendingGroupSummary = {
  chatId: number;
  title: string;
  type: string;
  detectedAt: string;
};

export async function listPendingGroups(): Promise<PendingGroupSummary[]> {
  await connectToDatabase();
  const rows = (await TelegramPendingGroupModel.find({})
    .sort({ detectedAt: -1 })
    .lean()) as TelegramPendingGroupRecord[];
  return rows.map((row) => ({
    chatId: row.chatId,
    title: row.title,
    type: row.type,
    detectedAt: row.detectedAt.toISOString(),
  }));
}

export async function onBotJoinedGroup(input: {
  chatId: number;
  title: string;
  type: string;
}) {
  await connectToDatabase();
  await TelegramPendingGroupModel.updateOne(
    { chatId: input.chatId },
    {
      $set: {
        title: input.title,
        type: input.type,
      },
      $setOnInsert: {
        chatId: input.chatId,
        detectedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function refreshPendingGroupTitle(chatId: number, title: string) {
  await connectToDatabase();
  await TelegramPendingGroupModel.updateOne(
    { chatId },
    { $set: { title } },
  );
}

export async function onBotLeftGroup(chatId: number) {
  await connectToDatabase();
  await Promise.all([
    RegionModel.updateMany(
      { telegramChatId: chatId },
      { $set: { telegramChatId: null, telegramChatTitle: null } },
    ),
    ZoneModel.updateMany(
      { telegramChatId: chatId },
      { $set: { telegramChatId: null, telegramChatTitle: null } },
    ),
    TeamModel.updateMany(
      { telegramChatId: chatId },
      { $set: { telegramChatId: null, telegramChatTitle: null } },
    ),
    TelegramPendingGroupModel.deleteOne({ chatId }),
  ]);
}

async function getPendingGroup(chatId: number) {
  const pending = (await TelegramPendingGroupModel.findOne({
    chatId,
  }).lean()) as TelegramPendingGroupRecord | null;
  if (!pending) {
    throw new Error("Nhóm Telegram chưa được phát hiện. Hãy thêm bot vào nhóm.");
  }
  return pending;
}

function modelFor(level: TelegramBindingLevel) {
  if (level === "region") return RegionModel;
  if (level === "zone") return ZoneModel;
  return TeamModel;
}

export async function bindGroup(input: {
  level: TelegramBindingLevel;
  id: string;
  chatId: number;
}) {
  await connectToDatabase();
  const pending = await getPendingGroup(input.chatId);
  const targetObjectId = toObjectId(input.id);

  const [regionConflict, zoneConflict, teamConflict] = await Promise.all([
    RegionModel.findOne({
      telegramChatId: pending.chatId,
      ...(input.level === "region" ? { _id: { $ne: targetObjectId } } : {}),
    })
      .select({ name: 1 })
      .lean() as Promise<{ name: string } | null>,
    ZoneModel.findOne({
      telegramChatId: pending.chatId,
      ...(input.level === "zone" ? { _id: { $ne: targetObjectId } } : {}),
    })
      .select({ name: 1 })
      .lean() as Promise<{ name: string } | null>,
    TeamModel.findOne({
      telegramChatId: pending.chatId,
      ...(input.level === "team" ? { _id: { $ne: targetObjectId } } : {}),
    })
      .select({ name: 1 })
      .lean() as Promise<{ name: string } | null>,
  ]);

  const conflict = regionConflict
    ? { label: "Khu vực", name: regionConflict.name }
    : zoneConflict
      ? { label: "Địa vực", name: zoneConflict.name }
      : teamConflict
        ? { label: "Nhóm", name: teamConflict.name }
        : null;

  if (conflict) {
    throw new Error(
      `Nhóm Telegram này đã được liên kết với ${conflict.label} "${conflict.name}". Hãy gỡ liên kết ở đó trước.`,
    );
  }

  await modelFor(input.level).updateOne(
    { _id: targetObjectId },
    {
      $set: {
        telegramChatId: pending.chatId,
        telegramChatTitle: pending.title,
      },
    },
  );
}

export async function unbindGroup(input: {
  level: TelegramBindingLevel;
  id: string;
}) {
  await connectToDatabase();
  await modelFor(input.level).updateOne(
    { _id: toObjectId(input.id) },
    { $set: { telegramChatId: null, telegramChatTitle: null } },
  );
}
