"use client";

import { useCallback, useEffect, useState } from "react";

export type PushStatus =
  | "checking"
  | "unsupported"
  | "unconfigured"
  | "denied"
  | "default"
  | "subscribed";

export type PushSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unsupported" | "unconfigured" | "denied" | "default" | "server_error" | "error";
    };

type Fetcher = typeof fetch;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getOrRegisterSW() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export async function persistPushSubscription(
  subscription: PushSubscription,
  userAgent: string,
  fetcher: Fetcher = fetch,
): Promise<PushSubscribeResult> {
  const json = subscription.toJSON();
  const res = await fetcher("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent,
    }),
  });

  if (!res.ok) {
    return { ok: false, reason: "server_error" };
  }

  return { ok: true };
}

export function useWebPush() {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setStatus("unconfigured");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await getOrRegisterSW();
      let sub = await reg.pushManager.getSubscription();

      if (Notification.permission === "granted") {
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }

        const result = await persistPushSubscription(sub, navigator.userAgent);
        setStatus(result.ok ? "subscribed" : "default");
        return;
      }
    } catch (err) {
      console.error("[push] refresh failed", err);
    }
    setStatus("default");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!isPushSupported()) return { ok: false, reason: "unsupported" };
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return { ok: false, reason: "unconfigured" };

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return { ok: false, reason: permission };
      }

      const reg = await getOrRegisterSW();
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const result = await persistPushSubscription(sub, navigator.userAgent);
      if (!result.ok) return result;

      setStatus("subscribed");
      return { ok: true };
    } catch (err) {
      console.error("[push] subscribe failed", err);
      return { ok: false, reason: "error" };
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!isPushSupported()) return { ok: false };
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setStatus("default");
      return { ok: true };
    } catch (err) {
      console.error("[push] unsubscribe failed", err);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, subscribe, unsubscribe, refresh };
}
