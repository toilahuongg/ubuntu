import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  sendMock,
  answerMock,
  editMarkupMock,
  saveSubmissionMock,
  getSessionUserByTelegramIdMock,
  getTelegramTodayDigestMock,
  getTelegramProfileMock,
  getTelegramLeaderboardMock,
} = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({ ok: true }),
  answerMock: vi.fn().mockResolvedValue({ ok: true }),
  editMarkupMock: vi.fn().mockResolvedValue({ ok: true }),
  saveSubmissionMock: vi.fn().mockResolvedValue("submission-1"),
  getSessionUserByTelegramIdMock: vi.fn(),
  getTelegramTodayDigestMock: vi.fn().mockResolvedValue("today-digest"),
  getTelegramProfileMock: vi.fn().mockResolvedValue("me-profile"),
  getTelegramLeaderboardMock: vi.fn().mockResolvedValue("leaderboard"),
}));

vi.mock("@/lib/telegram-bot", () => ({
  buildTelegramStartMarkup: () => undefined,
  safeAnswerCallbackQuery: answerMock,
  safeEditMessageReplyMarkup: editMarkupMock,
  safeSendTelegramMessage: sendMock,
}));

vi.mock("@/lib/notifications/telegram-presenters", () => ({
  getSessionUserByTelegramId: getSessionUserByTelegramIdMock,
  getTelegramLeaderboard: getTelegramLeaderboardMock,
  getTelegramProfile: getTelegramProfileMock,
  getTelegramTodayDigest: getTelegramTodayDigestMock,
}));

vi.mock("@/lib/tasks/submission-service", () => ({
  saveSubmission: saveSubmissionMock,
}));

import { POST } from "@/app/api/telegram/webhook/route";

const WEBHOOK_SECRET = "s3cret";

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/telegram/webhook", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
      ...headers,
    },
    method: "POST",
  });
}

describe("telegram webhook route", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", WEBHOOK_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("handles /help", async () => {
    const res = await POST(
      buildRequest({
        message: { chat: { id: 10 }, from: { id: 5 }, message_id: 1, text: "/help" },
      }),
    );
    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: 10, text: expect.stringContaining("/today") }),
    );
  });

  it("handles /today via digest helper", async () => {
    await POST(
      buildRequest({
        message: { chat: { id: 10 }, from: { id: 42 }, message_id: 2, text: "/today" },
      }),
    );
    expect(getTelegramTodayDigestMock).toHaveBeenCalledWith(42, expect.any(String));
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: 10, text: "today-digest" }),
    );
  });

  it("rejects unknown users on callback_query", async () => {
    getSessionUserByTelegramIdMock.mockResolvedValueOnce(null);

    await POST(
      buildRequest({
        callback_query: {
          data: "done:abc",
          from: { id: 99 },
          id: "cb-1",
          message: { chat: { id: 10 }, message_id: 3 },
        },
      }),
    );

    expect(saveSubmissionMock).not.toHaveBeenCalled();
    expect(answerMock).toHaveBeenCalledWith(
      expect.objectContaining({ callbackQueryId: "cb-1", showAlert: true }),
    );
  });

  it("records submission on callback_query for active user", async () => {
    getSessionUserByTelegramIdMock.mockResolvedValueOnce({
      id: "user-1",
      fullName: "A",
      role: "MEMBER",
      status: "ACTIVE",
      teamId: "team-1",
    });

    await POST(
      buildRequest({
        callback_query: {
          data: "done:occ-1",
          from: { id: 42 },
          id: "cb-2",
          message: { chat: { id: 10 }, message_id: 3 },
        },
      }),
    );

    expect(saveSubmissionMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      "occ-1",
      "user-1",
    );
    expect(editMarkupMock).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: 10, messageId: 3 }),
    );
    expect(answerMock).toHaveBeenCalledWith(
      expect.objectContaining({ callbackQueryId: "cb-2", text: "✅ Đã ghi nhận!" }),
    );
  });

  it("rejects requests with an invalid webhook secret", async () => {
    const res = await POST(
      buildRequest(
        { message: { chat: { id: 1 }, message_id: 1, text: "/help" } },
        { "x-telegram-bot-api-secret-token": "wrong" },
      ),
    );
    expect(res.status).toBe(403);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("fails closed when webhook secret is not configured", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    await expect(
      POST(
        buildRequest({
          message: { chat: { id: 1 }, message_id: 1, text: "/help" },
        }),
      ),
    ).rejects.toThrow(/TELEGRAM_WEBHOOK_SECRET/);
  });
});
