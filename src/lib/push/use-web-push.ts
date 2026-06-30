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

type PushDebugDetails = Record<string, unknown>;

type PushDebugEntry = {
  at: string;
  event: string;
  details: PushDebugDetails;
};

declare global {
  interface Window {
    __ubuntuPushDebugLogs?: PushDebugEntry[];
  }
}

const PUSH_DEBUG_STORAGE_KEY = "ubuntu_push_debug_v1";
const MAX_PUSH_DEBUG_ENTRIES = 50;

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

export function isIOSUserAgent(userAgent: string) {
  return /iphone|ipad|ipod/.test(userAgent.toLowerCase());
}

export function getIOSWebPushInstallStatus(input: IOSWebPushInstallInput) {
  if (!isIOSUserAgent(input.userAgent)) return "ready";

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

function getStandaloneSnapshot() {
  return {
    standalone:
      "standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
  };
}

function getPushEnvironmentSnapshot() {
  if (typeof window === "undefined") return {};

  const standalone = getStandaloneSnapshot();
  return {
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    notificationPermission:
      "Notification" in window ? Notification.permission : "missing",
    isIOS: isIOSUserAgent(navigator.userAgent),
    iosInstallStatus: getIOSWebPushInstallStatus({
      userAgent: navigator.userAgent,
      standalone: standalone.standalone,
      displayModeStandalone: standalone.displayModeStandalone,
    }),
    standalone: standalone.standalone,
    displayModeStandalone: standalone.displayModeStandalone,
    vapidPublicKeyPresent: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    userAgent: navigator.userAgent,
  };
}

function serializePushError(error: unknown) {
  if (error instanceof DOMException) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return { value: String(error) };
}

function getRegistrationDebug(reg: ServiceWorkerRegistration) {
  return {
    scope: reg.scope,
    activeState: reg.active?.state,
    installingState: reg.installing?.state,
    waitingState: reg.waiting?.state,
  };
}

function getSubscriptionDebug(sub: PushSubscription | null) {
  return {
    hasSubscription: Boolean(sub),
    endpointPrefix: sub?.endpoint.slice(0, 60),
  };
}

export function logPushDebug(event: string, details: PushDebugDetails = {}) {
  if (typeof window === "undefined") return;

  const entry: PushDebugEntry = {
    at: new Date().toISOString(),
    event,
    details,
  };

  try {
    const current = window.__ubuntuPushDebugLogs ?? [];
    window.__ubuntuPushDebugLogs = [...current, entry].slice(
      -MAX_PUSH_DEBUG_ENTRIES,
    );
    localStorage.setItem(
      PUSH_DEBUG_STORAGE_KEY,
      JSON.stringify(window.__ubuntuPushDebugLogs),
    );
  } catch {
    // Debug logging must never break push subscription.
  }

  console.info(`[push-debug] ${event}`, details);
}

async function getOrRegisterSW() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    logPushDebug("service_worker:existing", getRegistrationDebug(existing));
    return existing;
  }
  logPushDebug("service_worker:register:start");
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  logPushDebug(
    "service_worker:register:success",
    getRegistrationDebug(registration),
  );
  return registration;
}

async function getReadyServiceWorkerRegistration() {
  await getOrRegisterSW();
  const readyRegistration = await navigator.serviceWorker.ready;
  logPushDebug(
    "service_worker:ready",
    getRegistrationDebug(readyRegistration),
  );
  return readyRegistration;
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
  logPushDebug("subscribe_api:request", {
    endpointPrefix: json.endpoint?.slice(0, 60),
    hasP256dh: Boolean(json.keys?.p256dh),
    hasAuth: Boolean(json.keys?.auth),
  });
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

    logPushDebug("subscribe_api:error", {
      status: res.status,
      message,
    });

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

  logPushDebug("subscribe_api:success", { status: res.status });
  return { ok: true };
}

export function useWebPush() {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    logPushDebug("refresh:start", getPushEnvironmentSnapshot());
    if (!isPushSupported()) {
      logPushDebug("refresh:unsupported", getPushEnvironmentSnapshot());
      setStatus("unsupported");
      return;
    }
    if (getCurrentIOSWebPushInstallStatus() === "needs_home_screen") {
      logPushDebug("refresh:ios_not_installed", getPushEnvironmentSnapshot());
      setStatus("ios_not_installed");
      return;
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      logPushDebug("refresh:unconfigured", getPushEnvironmentSnapshot());
      setStatus("unconfigured");
      return;
    }
    if (Notification.permission === "denied") {
      logPushDebug("refresh:denied", getPushEnvironmentSnapshot());
      setStatus("denied");
      return;
    }
    try {
      const reg = await getReadyServiceWorkerRegistration();
      let sub = await reg.pushManager.getSubscription();
      logPushDebug("refresh:subscription", getSubscriptionDebug(sub));

      if (Notification.permission === "granted") {
        if (!sub) {
          logPushDebug("refresh:subscribe_missing:start");
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
          logPushDebug(
            "refresh:subscribe_missing:success",
            getSubscriptionDebug(sub),
          );
        }

        const result = await persistPushSubscription(sub, navigator.userAgent);
        logPushDebug("refresh:persist_result", result);
        setStatus(result.ok ? "subscribed" : "default");
        return;
      }
    } catch (err) {
      logPushDebug("refresh:error", serializePushError(err));
      console.error("[push] refresh failed", err);
    }
    logPushDebug("refresh:default", getPushEnvironmentSnapshot());
    setStatus("default");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async (): Promise<PushSubscribeResult> => {
    logPushDebug("subscribe:start", getPushEnvironmentSnapshot());
    if (!isPushSupported()) {
      logPushDebug("subscribe:unsupported", getPushEnvironmentSnapshot());
      return { ok: false, reason: "unsupported" };
    }
    if (getCurrentIOSWebPushInstallStatus() === "needs_home_screen") {
      logPushDebug("subscribe:ios_not_installed", getPushEnvironmentSnapshot());
      setStatus("ios_not_installed");
      return { ok: false, reason: "ios_not_installed" };
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      logPushDebug("subscribe:unconfigured", getPushEnvironmentSnapshot());
      return { ok: false, reason: "unconfigured" };
    }

    setLoading(true);
    try {
      logPushDebug("permission:request:start", getPushEnvironmentSnapshot());
      const permission = await Notification.requestPermission();
      logPushDebug("permission:request:result", { permission });
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return { ok: false, reason: permission };
      }

      const reg = await getReadyServiceWorkerRegistration();

      let sub = await reg.pushManager.getSubscription();
      logPushDebug("subscribe:existing_subscription", getSubscriptionDebug(sub));
      if (!sub) {
        logPushDebug("push_manager:subscribe:start", {
          registration: getRegistrationDebug(reg),
        });
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        logPushDebug("push_manager:subscribe:success", getSubscriptionDebug(sub));
      }

      const result = await persistPushSubscription(sub, navigator.userAgent);
      logPushDebug("subscribe:persist_result", result);
      if (!result.ok) {
        return result;
      }

      setStatus("subscribed");
      return { ok: true };
    } catch (err) {
      logPushDebug("subscribe:error", serializePushError(err));
      console.error("[push] subscribe failed", err);
      return classifyPushSubscribeError(err);
    } finally {
      logPushDebug("subscribe:finish");
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
