import { describe, expect, it, vi } from "vitest";

import {
  signTelegramInitDataForTests,
  verifyTelegramInitData,
} from "@/lib/auth/telegram";

describe("verifyTelegramInitData", () => {
  it("accepts valid Telegram initData", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:test-bot-token");
    const userPayload = JSON.stringify({
      first_name: "An",
      id: 42,
      username: "an_ops",
    });

    const initData = signTelegramInitDataForTests(
      {
        auth_date: `${Math.floor(Date.now() / 1000)}`,
        query_id: "abc123",
        user: userPayload,
      },
      "123:test-bot-token",
    );

    expect(verifyTelegramInitData(initData)).toMatchObject({
      id: 42,
      username: "an_ops",
    });
  });

  it("rejects tampered hashes", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:test-bot-token");

    expect(() =>
      verifyTelegramInitData(
        "auth_date=1&query_id=test&user=%7B%22id%22%3A1%7D&hash=invalid",
      ),
    ).toThrow("Xác thực Telegram không hợp lệ.");
  });
});
