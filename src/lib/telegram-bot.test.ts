import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildReminderMarkup,
  safeSendTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram-bot";

describe("telegram-bot", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends a message with the Telegram sendMessage endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    await sendTelegramMessage({ chatId: 7, text: "hello" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/bot123:test/sendMessage");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ chat_id: 7, text: "hello" });
  });

  it("does not retry on 4xx and surfaces the error", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Forbidden", { status: 403 }),
    );

    await expect(
      sendTelegramMessage({ chatId: 1, text: "x" }),
    ).rejects.toThrow(/403/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("safeSendTelegramMessage swallows errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Forbidden", { status: 403 }),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await safeSendTelegramMessage({ chatId: 1, text: "x" });
    expect(result.ok).toBe(false);
  });

  it("buildReminderMarkup includes both WebApp and callback buttons", () => {
    const markup = buildReminderMarkup("abc123");
    expect(markup).toBeDefined();
    const buttons = markup!.inline_keyboard.flat();
    expect(buttons.some((b) => b.web_app?.url.endsWith("/dashboard"))).toBe(
      true,
    );
    expect(
      buttons.some((b) => b.callback_data === "done:abc123"),
    ).toBe(true);
  });
});
