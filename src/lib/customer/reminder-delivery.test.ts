import { afterEach, describe, expect, it, vi } from "vitest";

const {
  deleteInactiveCustomersMock,
  getCustomerReminderCandidatesMock,
  markCustomerReminderSentMock,
  sendTelegramMock,
  sendWebPushMock,
} = vi.hoisted(() => ({
  deleteInactiveCustomersMock: vi.fn().mockResolvedValue({ deletedCount: 0 }),
  getCustomerReminderCandidatesMock: vi.fn().mockResolvedValue([]),
  markCustomerReminderSentMock: vi.fn().mockResolvedValue(undefined),
  sendTelegramMock: vi.fn().mockResolvedValue({ ok: true }),
  sendWebPushMock: vi.fn().mockResolvedValue({ sent: 0 }),
}));

vi.mock("@/lib/customer/reminder-service", () => ({
  deleteInactiveCustomers: deleteInactiveCustomersMock,
  getCustomerReminderCandidates: getCustomerReminderCandidatesMock,
  markCustomerReminderSent: markCustomerReminderSentMock,
}));

vi.mock("@/lib/telegram-bot", () => ({
  buildTelegramStartMarkup: () => undefined,
  safeSendTelegramMessage: sendTelegramMock,
}));

vi.mock("@/lib/notifications/web-push", () => ({
  safeSendWebPush: sendWebPushMock,
}));

import { runCustomerReminderSweep } from "@/lib/customer/reminder-delivery";

describe("customer reminder delivery", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deletes inactive customers before building reminder candidates", async () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");

    await runCustomerReminderSweep({ sweepAt, thresholdDays: 3 });

    expect(deleteInactiveCustomersMock).toHaveBeenCalledWith({ sweepAt });
    expect(getCustomerReminderCandidatesMock).toHaveBeenCalledWith({
      sweepAt,
      thresholdDays: 3,
    });
    expect(deleteInactiveCustomersMock.mock.invocationCallOrder[0]).toBeLessThan(
      getCustomerReminderCandidatesMock.mock.invocationCallOrder[0],
    );
  });
});
