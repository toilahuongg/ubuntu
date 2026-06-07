import { describe, expect, it, vi } from "vitest";

import {
  classifyPushSubscribeError,
  getIOSWebPushInstallStatus,
  persistPushSubscription,
} from "@/lib/push/use-web-push";

describe("getIOSWebPushInstallStatus", () => {
  it("requires iOS Safari users to open the installed Home Screen app", () => {
    expect(
      getIOSWebPushInstallStatus({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
        standalone: false,
        displayModeStandalone: false,
      }),
    ).toBe("needs_home_screen");
  });

  it("allows iOS Safari users when the PWA is running standalone", () => {
    expect(
      getIOSWebPushInstallStatus({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
        standalone: true,
        displayModeStandalone: false,
      }),
    ).toBe("ready");
  });

  it("does not block non-iOS browsers", () => {
    expect(
      getIOSWebPushInstallStatus({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        standalone: false,
        displayModeStandalone: false,
      }),
    ).toBe("ready");
  });
});

describe("classifyPushSubscribeError", () => {
  it("identifies iOS/browser permission failures from DOMException names", () => {
    const error = new DOMException("Registration failed", "NotAllowedError");

    expect(classifyPushSubscribeError(error)).toEqual({
      ok: false,
      reason: "not_allowed",
    });
  });

  it("identifies service worker readiness failures from error messages", () => {
    const error = new Error("No active Service Worker");

    expect(classifyPushSubscribeError(error)).toEqual({
      ok: false,
      reason: "service_worker",
    });
  });
});

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
