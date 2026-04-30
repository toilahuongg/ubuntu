import { getTodayDateKey } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import {
  buildTelegramStartMarkup,
  safeAnswerCallbackQuery,
  safeEditMessageReplyMarkup,
  safeSendTelegramMessage,
  type TelegramMyChatMemberUpdate,
  type TelegramUpdate,
} from "@/lib/telegram-bot";
import {
  getSessionUserByTelegramId,
  getTelegramLeaderboard,
  getTelegramProfile,
  getTelegramTodayDigest,
} from "@/lib/notifications/telegram-presenters";
import { saveSubmission } from "@/lib/tasks/submission-service";
import {
  onBotJoinedGroup,
  onBotLeftGroup,
  refreshPendingGroupTitle,
} from "@/lib/services/telegram-binding-service";
import { methodNotAllowed, runApiHandler } from "./api._utils";

const HELP_TEXT = [
  "🤖 Các lệnh hiện có:",
  "/start — mở app nhiệm vụ",
  "/today — xem nhiệm vụ hôm nay",
  "/me — thông tin cá nhân",
  "/leaderboard — bảng xếp hạng nhóm",
  "/help — xem lại menu này",
].join("\n");

function parseCommand(text: string): string {
  const match = text.trim().match(/^\/([a-zA-Z_]+)(?:@\S+)?/);
  return match ? match[1]!.toLowerCase() : "";
}

const GROUP_CHAT_TYPES = new Set(["group", "supergroup"]);

async function handleMyChatMember(update: TelegramMyChatMemberUpdate) {
  const chatType = update.chat.type;
  if (!chatType || !GROUP_CHAT_TYPES.has(chatType)) return;

  const status = update.new_chat_member.status;
  if (status === "member" || status === "administrator" || status === "creator") {
    await onBotJoinedGroup({
      chatId: update.chat.id,
      title: update.chat.title ?? `Chat ${update.chat.id}`,
      type: chatType,
    });
    return;
  }

  if (status === "left" || status === "kicked") {
    await onBotLeftGroup(update.chat.id);
  }
}

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
  const chatType = message.chat.type;
  const isGroup = !!chatType && GROUP_CHAT_TYPES.has(chatType);

  if (isGroup && message.chat.title) {
    await refreshPendingGroupTitle(message.chat.id, message.chat.title);
  }

  const chatId = message.chat.id;
  const text = message.text ?? "";
  const fromId = message.from?.id;
  const command = parseCommand(text);

  if (!command) return;
  if (isGroup && command !== "start") return;

  switch (command) {
    case "start":
      await safeSendTelegramMessage({
        chatId,
        replyMarkup: buildTelegramStartMarkup({ inGroup: isGroup }),
        text: isGroup
          ? [
              "Chào cả nhóm! Mình là bot nhiệm vụ mỗi ngày.",
              "",
              "Nút bên dưới sẽ mở app trong trình duyệt.",
              "👉 Muốn mở app trực tiếp trong Telegram (không qua trình duyệt), hãy nhắn tin riêng với mình rồi gõ /start — trong chat riêng, nút sẽ mở web app ngay trong Telegram.",
              "",
              "Các lệnh cá nhân (/today, /me, /leaderboard) cũng chỉ dùng được trong chat riêng.",
            ].join("\n")
          : "Chào mừng bạn đến với app nhiệm vụ mỗi ngày. Bấm nút dưới đây để mở web app và bắt đầu cập nhật. Gõ /help để xem các lệnh khác.",
      });
      return;
    case "help":
      await safeSendTelegramMessage({ chatId, text: HELP_TEXT });
      return;
    case "today": {
      if (!fromId) {
        await safeSendTelegramMessage({ chatId, text: "Không xác định được người dùng Telegram." });
        return;
      }
      const digest = await getTelegramTodayDigest(fromId, getTodayDateKey());
      await safeSendTelegramMessage({ chatId, text: digest });
      return;
    }
    case "me": {
      if (!fromId) {
        await safeSendTelegramMessage({ chatId, text: "Không xác định được người dùng Telegram." });
        return;
      }
      const profile = await getTelegramProfile(fromId);
      await safeSendTelegramMessage({ chatId, text: profile });
      return;
    }
    case "leaderboard": {
      if (!fromId) {
        await safeSendTelegramMessage({ chatId, text: "Không xác định được người dùng Telegram." });
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
    await safeAnswerCallbackQuery({ callbackQueryId: callback.id, text: "Hành động không được hỗ trợ." });
    return;
  }

  const taskId = data.slice("done:".length).trim();
  if (!taskId) {
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
    await saveSubmission(actor, taskId, actor.id);

    if (callback.message) {
      await safeEditMessageReplyMarkup({
        chatId: callback.message.chat.id,
        messageId: callback.message.message_id,
      });
    }

    await safeAnswerCallbackQuery({ callbackQueryId: callback.id, text: "✅ Đã ghi nhận!" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    await safeAnswerCallbackQuery({
      callbackQueryId: callback.id,
      showAlert: true,
      text: message.slice(0, 200),
    });
  }
}

async function post(request: Request) {
  const expectedSecret = requireEnv("TELEGRAM_WEBHOOK_SECRET");
  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (providedSecret !== expectedSecret) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: true });
  }

  try {
    if (update.my_chat_member) {
      await handleMyChatMember(update.my_chat_member);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (error) {
    console.error("[telegram] webhook handler failed:", error);
  }

  return Response.json({ ok: true });
}

export function loader() { return methodNotAllowed(); }
export function action({ request }: { request: Request }) {
  if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
  return runApiHandler(request, post);
}
