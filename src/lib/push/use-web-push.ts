"use client";

import { useCallback, useEffect, useState } from "react";

export type PushStatus =
  | "checking"
  | "unsupported"
  | "ios_not_installed"
  | "unconfigured"
  | "denied"
  | "default"
  | "subscribed";

export type PushSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "unsupported"
        | "ios_not_installed"
        | "unconfigured"
        | "denied"
        | "default"
        | "unauthorized"
        | "bad_request"
        | "server_error"
        | "not_allowed"
        | "invalid_key"
        | "service_worker"
        | "error";
      message?: string;
      status?: number;
    };

type Fetcher = typeof fetch;

type IOSWebPushInstallInput = {
  userAgent: string;
  standalone: boolean;
  displayModeStandalone: boolean;
};

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

export function getIOSWebPushInstallStatus(input: IOSWebPushInstallInput) {
  const ua = input.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
  if (!isIOS) return "ready";

  return input.standalone || input.displayModeStandalone
    ? "ready"
    : "needs_home_screen";
}

function getCurrentIOSWebPushInstallStatus() {
  return getIOSWebPushInstallStatus({
    userAgent: navigator.userAgent,
    standalone:
      "standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
  });
}

async function getOrRegisterSW() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

async function getReadyServiceWorkerRegistration() {
  await getOrRegisterSW();
  return navigator.serviceWorker.ready;
}

export function classifyPushSubscribeError(error: unknown): PushSubscribeResult {
  const name = error instanceof DOMException ? error.name : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (name === "NotAllowedError" || message.includes("not allowed")) {
    return { ok: false, reason: "not_allowed" };
  }
  if (
    name === "InvalidCharacterError" ||
    name === "InvalidAccessError" ||
    message.includes("applicationserverkey") ||
    message.includes("vapid")
  ) {
    return { ok: false, reason: "invalid_key" };
  }
  if (message.includes("service worker") || message.includes("registration")) {
    return { ok: false, reason: "service_worker" };
  }

  return { ok: false, reason: "error" };
}

export async function persistPushSubscription(
  subscription: PushSubscription,
  userAgent: string,
  fetcher: Fetcher = fetch,
): Promise<PushSubscribeResult> {
  const json = subscription.toJSON();
  const res = await fetcher("/api/push/subscribe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent,
    }),
  });

  if (!res.ok) {
    let message: string | undefined;
    try {
      const body = (await res.json()) as { error?: string };
      message = body.error;
    } catch {
      message = undefined;
    }

    if (res.status === 401) {
      return {
        ok: false,
        reason: "unauthorized",
        ...(message ? { message } : {}),
        status: res.status,
      };
    }
    if (res.status >= 400 && res.status < 500) {
      return {
        ok: false,
        reason: "bad_request",
        ...(message ? { message } : {}),
        status: res.status,
      };
    }

    return {
      ok: false,
      reason: "server_error",
      ...(message ? { message } : {}),
      status: res.status,
    };
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
    if (getCurrentIOSWebPushInstallStatus() === "needs_home_screen") {
      setStatus("ios_not_installed");
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
      const reg = await getReadyServiceWorkerRegistration();
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

  const subscribe = useCallback(async (): Promise<PushSubscribeResult> => {
    if (!isPushSupported()) return { ok: false, reason: "unsupported" };
    if (getCurrentIOSWebPushInstallStatus() === "needs_home_screen") {
      setStatus("ios_not_installed");
      return { ok: false, reason: "ios_not_installed" };
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return { ok: false, reason: "unconfigured" };

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return { ok: false, reason: permission };
      }

      const reg = await getReadyServiceWorkerRegistration();

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
      return classifyPushSubscribeError(err);
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
