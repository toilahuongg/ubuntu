import "server-only";

import { getOptionalEnv, requireEnv } from "@/lib/env";

export type TelegramInlineKeyboardButton = {
  text: string;
  url?: string;
  web_app?: { url: string };
  callback_data?: string;
};

export type TelegramReplyMarkup = {
  inline_keyboard: TelegramInlineKeyboardButton[][];
};

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramChat = {
  id: number;
  type?: string;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = [500, 1500];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function telegramFetch(
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/${method}`,
        {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );

      if (response.ok) {
        return await response.json();
      }

      const errorText = await response.text();
      const errorMessage = `Telegram ${method} failed (${response.status}): ${errorText}`;

      // Do not retry on client errors (e.g. 400 bad request, 403 bot blocked).
      if (response.status >= 400 && response.status < 500) {
        throw new Error(errorMessage);
      }

      lastError = new Error(errorMessage);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      // Re-throw immediately for client errors; only retry transient failures.
      if (message.includes("failed (4")) {
        throw error;
      }
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS[attempt] ?? 1000);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Telegram ${method} failed after retries.`);
}

export async function sendTelegramMessage(input: {
  chatId: number;
  replyMarkup?: TelegramReplyMarkup;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
  disableWebPagePreview?: boolean;
}) {
  return telegramFetch("sendMessage", {
    chat_id: input.chatId,
    disable_web_page_preview: input.disableWebPagePreview,
    parse_mode: input.parseMode,
    reply_markup: input.replyMarkup,
    text: input.text,
  });
}

export async function safeSendTelegramMessage(input: {
  chatId: number;
  replyMarkup?: TelegramReplyMarkup;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
  disableWebPagePreview?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendTelegramMessage(input);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[telegram] sendMessage failed for chat ${input.chatId}: ${message}`,
    );
    return { ok: false, error: message };
  }
}

export async function answerCallbackQuery(input: {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
}) {
  return telegramFetch("answerCallbackQuery", {
    callback_query_id: input.callbackQueryId,
    show_alert: input.showAlert,
    text: input.text,
  });
}

export async function safeAnswerCallbackQuery(input: {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
}): Promise<{ ok: boolean }> {
  try {
    await answerCallbackQuery(input);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[telegram] answerCallbackQuery failed for ${input.callbackQueryId}: ${message}`,
    );
    return { ok: false };
  }
}

export async function editMessageReplyMarkup(input: {
  chatId: number;
  messageId: number;
  replyMarkup?: TelegramReplyMarkup;
}) {
  return telegramFetch("editMessageReplyMarkup", {
    chat_id: input.chatId,
    message_id: input.messageId,
    reply_markup: input.replyMarkup,
  });
}

export async function safeEditMessageReplyMarkup(input: {
  chatId: number;
  messageId: number;
  replyMarkup?: TelegramReplyMarkup;
}): Promise<{ ok: boolean }> {
  try {
    await editMessageReplyMarkup(input);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[telegram] editMessageReplyMarkup failed for chat ${input.chatId}: ${message}`,
    );
    return { ok: false };
  }
}

export function buildTelegramStartMarkup(): TelegramReplyMarkup | undefined {
  const appUrl = getOptionalEnv().appUrl;

  if (!appUrl) {
    return undefined;
  }

  return {
    inline_keyboard: [
      [
        {
          text: "Mở app nhiệm vụ",
          web_app: { url: `${appUrl}/login` },
        },
      ],
    ],
  };
}

export function buildReminderMarkup(
  occurrenceId: string,
): TelegramReplyMarkup | undefined {
  const appUrl = getOptionalEnv().appUrl;
  const rows: TelegramInlineKeyboardButton[][] = [];

  if (appUrl) {
    rows.push([
      {
        text: "Mở app",
        web_app: { url: `${appUrl}/dashboard` },
      },
    ]);
  }

  rows.push([
    {
      text: "✅ Đánh dấu xong",
      callback_data: `done:${occurrenceId}`,
    },
  ]);

  return { inline_keyboard: rows };
}
