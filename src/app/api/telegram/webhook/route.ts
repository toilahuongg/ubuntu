import { NextResponse } from "next/server";

import { getTodayDateKey } from "@/lib/dates";
import { getOptionalEnv } from "@/lib/env";
import {
  buildTelegramStartMarkup,
  safeAnswerCallbackQuery,
  safeEditMessageReplyMarkup,
  safeSendTelegramMessage,
  type TelegramUpdate,
} from "@/lib/telegram-bot";
import {
  getSessionUserByTelegramId,
  getTelegramLeaderboard,
  getTelegramProfile,
  getTelegramTodayDigest,
  saveSubmission,
} from "@/lib/services/task-service";

const HELP_TEXT = [
  "🤖 Các lệnh hiện có:",
  "/start — mở app nhiệm vụ",
  "/today — xem nhiệm vụ hôm nay",
  "/me — thông tin cá nhân",
  "/leaderboard — bảng xếp hạng nhóm",
  "/help — xem lại menu này",
].join("\n");

function parseCommand(text: string): string {
  // Supports "/cmd", "/cmd@bot", "/cmd arg1 arg2"
  const match = text.trim().match(/^\/([a-zA-Z_]+)(?:@\S+)?/);
  return match ? match[1]!.toLowerCase() : "";
}

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
  const chatId = message.chat.id;
  const text = message.text ?? "";
  const fromId = message.from?.id;
  const command = parseCommand(text);

  if (!command) {
    return;
  }

  switch (command) {
    case "start":
      await safeSendTelegramMessage({
        chatId,
        replyMarkup: buildTelegramStartMarkup(),
        text:
          "Chào mừng bạn đến với app nhiệm vụ mỗi ngày. Bấm nút dưới đây để mở web app và bắt đầu cập nhật. Gõ /help để xem các lệnh khác.",
      });
      return;

    case "help":
      await safeSendTelegramMessage({ chatId, text: HELP_TEXT });
      return;

    case "today": {
      if (!fromId) {
        await safeSendTelegramMessage({
          chatId,
          text: "Không xác định được người dùng Telegram.",
        });
        return;
      }
      const digest = await getTelegramTodayDigest(fromId, getTodayDateKey());
      await safeSendTelegramMessage({ chatId, text: digest });
      return;
    }

    case "me": {
      if (!fromId) {
        await safeSendTelegramMessage({
          chatId,
          text: "Không xác định được người dùng Telegram.",
        });
        return;
      }
      const profile = await getTelegramProfile(fromId);
      await safeSendTelegramMessage({ chatId, text: profile });
      return;
    }

    case "leaderboard": {
      if (!fromId) {
        await safeSendTelegramMessage({
          chatId,
          text: "Không xác định được người dùng Telegram.",
        });
        return;
      }
      const board = await getTelegramLeaderboard(fromId);
      await safeSendTelegramMessage({ chatId, text: board });
      return;
    }

    default:
      await safeSendTelegramMessage({
        chatId,
        text: `Chưa hỗ trợ lệnh /${command}. Gõ /help để xem danh sách.`,
      });
  }
}

async function handleCallbackQuery(
  callback: NonNullable<TelegramUpdate["callback_query"]>,
) {
  const data = callback.data ?? "";
  const fromId = callback.from.id;

  if (!data.startsWith("done:")) {
    await safeAnswerCallbackQuery({
      callbackQueryId: callback.id,
      text: "Hành động không được hỗ trợ.",
    });
    return;
  }

  const occurrenceId = data.slice("done:".length).trim();
  if (!occurrenceId) {
    await safeAnswerCallbackQuery({
      callbackQueryId: callback.id,
      text: "Thiếu mã nhiệm vụ.",
      showAlert: true,
    });
    return;
  }

  const actor = await getSessionUserByTelegramId(fromId);
  if (!actor) {
    await safeAnswerCallbackQuery({
      callbackQueryId: callback.id,
      text: "Tài khoản chưa được kích hoạt.",
      showAlert: true,
    });
    return;
  }

  try {
    await saveSubmission(actor, occurrenceId, actor.id);

    if (callback.message) {
      await safeEditMessageReplyMarkup({
        chatId: callback.message.chat.id,
        messageId: callback.message.message_id,
      });
    }

    await safeAnswerCallbackQuery({
      callbackQueryId: callback.id,
      text: "✅ Đã ghi nhận!",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    await safeAnswerCallbackQuery({
      callbackQueryId: callback.id,
      showAlert: true,
      text: message.slice(0, 200),
    });
  }
}

export async function POST(request: Request) {
  // Verify Telegram's secret token when configured. See
  // https://core.telegram.org/bots/api#setwebhook — `secret_token`.
  const expectedSecret = getOptionalEnv().telegramWebhookSecret;
  if (expectedSecret) {
    const providedSecret = request.headers.get(
      "x-telegram-bot-api-secret-token",
    );
    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (error) {
    // Always 200 so Telegram does not flood retries. Log for observability.
    console.error("[telegram] webhook handler failed:", error);
  }

  return NextResponse.json({ ok: true });
}
