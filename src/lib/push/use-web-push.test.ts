import { describe, expect, it, vi } from "vitest";

import { persistPushSubscription } from "@/lib/push/use-web-push";

describe("persistPushSubscription", () => {
  it("posts the serialized browser subscription to the subscribe endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.example/subscription-id",
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
      }),
    } as unknown as PushSubscription;

    const result = await persistPushSubscription(subscription, "Test User Agent", fetcher);

    expect(result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://push.example/subscription-id",
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
        userAgent: "Test User Agent",
      }),
    });
  });

  it("reports server_error when the subscribe endpoint rejects the subscription", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.example/subscription-id",
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
      }),
    } as unknown as PushSubscription;

    await expect(
      persistPushSubscription(subscription, "Test User Agent", fetcher),
    ).resolves.toEqual({ ok: false, reason: "server_error" });
  });
});
