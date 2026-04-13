import { NextResponse } from "next/server";

import { buildTelegramStartMarkup, sendTelegramMessage } from "@/lib/telegram-bot";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
  };
};

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as TelegramUpdate;
    const text = update.message?.text || "";
    const chatId = update.message?.chat.id;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/start")) {
      await sendTelegramMessage({
        chatId,
        replyMarkup: buildTelegramStartMarkup(),
        text:
          "Chao mung ban den voi app nhiem vu moi ngay. Bam nut duoi day de mo web app va bat dau cap nhat.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Telegram webhook failed.",
      },
      { status: 500 },
    );
  }
}
