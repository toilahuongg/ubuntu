import "server-only";

import { getOptionalEnv, requireEnv } from "@/lib/env";

type TelegramReplyMarkup = {
  inline_keyboard?: Array<
    Array<{
      text: string;
      url?: string;
      web_app?: { url: string };
    }>
  >;
};

async function telegramFetch(method: string, body: Record<string, unknown>) {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API failed: ${errorText}`);
  }

  return response.json();
}

export async function sendTelegramMessage(input: {
  chatId: number;
  replyMarkup?: TelegramReplyMarkup;
  text: string;
}) {
  return telegramFetch("sendMessage", {
    chat_id: input.chatId,
    reply_markup: input.replyMarkup,
    text: input.text,
  });
}

export function buildTelegramStartMarkup() {
  const appUrl = getOptionalEnv().appUrl;

  if (!appUrl) {
    return undefined;
  }

  return {
    inline_keyboard: [
      [
        {
          text: "Mo app nhiem vu",
          web_app: {
            url: `${appUrl}/login`,
          },
        },
      ],
    ],
  } satisfies TelegramReplyMarkup;
}
