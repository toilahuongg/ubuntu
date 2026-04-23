"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BellRing, BellOff, Loader2, X } from "lucide-react";

import { useWebPush } from "@/lib/push/use-web-push";

const SNOOZE_KEY = "push_permission_popup_snoozed_until_v1";
const SNOOZE_EVENT = "push-permission-popup-snooze";
const SNOOZE_MS = 24 * 60 * 60 * 1000;

function isSnoozed() {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function getSnoozeUntil() {
  return Date.now() + SNOOZE_MS;
}

function snoozePopup(until: number) {
  try {
    localStorage.setItem(SNOOZE_KEY, String(until));
    window.dispatchEvent(new Event(SNOOZE_EVENT));
  } catch {
    // ignore
  }
}

function subscribeToSnooze(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SNOOZE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SNOOZE_EVENT, callback);
  };
}

function getSnoozeSnapshot() {
  return isSnoozed();
}

function getServerSnoozeSnapshot() {
  return true;
}

export function PushPermissionPopup() {
  const { status, loading, subscribe } = useWebPush();
  const snoozed = useSyncExternalStore(
    subscribeToSnooze,
    getSnoozeSnapshot,
    getServerSnoozeSnapshot,
  );
  const [message, setMessage] = useState<string | null>(null);

  const shouldPrompt = status === "default" || status === "denied";
  const isDenied = status === "denied";
  const open = shouldPrompt && !snoozed;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        snoozePopup(getSnoozeUntil());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) {
    return null;
  }

  const dismiss = () => {
    snoozePopup(getSnoozeUntil());
  };

  const handleSubscribe = async () => {
    setMessage(null);
    const result = await subscribe();
    if (result.ok) {
      return;
    }
    if (result.reason === "denied") {
      setMessage("Bạn đã chặn thông báo. Hãy bật lại trong cài đặt trình duyệt.");
      return;
    }
    setMessage("Chưa thể bật thông báo lúc này. Vui lòng thử lại sau.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/45 px-4 py-5 backdrop-blur-[6px] sm:items-center"
      role="presentation"
    >
      <div
        aria-describedby="push-permission-popup-description"
        aria-labelledby="push-permission-popup-title"
        aria-modal="true"
        className="glass-strong relative animate-scale-in rounded-2xl p-5 shadow-2xl"
        role="dialog"
        style={{ width: "calc(100vw - 32px)", maxWidth: 390 }}
      >
        <button
          aria-label="Đóng nhắc bật thông báo"
          className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-overlay-medium hover:text-foreground"
          onClick={dismiss}
          type="button"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            {isDenied ? (
              <BellOff aria-hidden className="h-5 w-5" />
            ) : (
              <BellRing aria-hidden className="h-5 w-5" />
            )}
          </div>
          <h2
            id="push-permission-popup-title"
            className="min-w-0 pt-0.5 text-lg font-semibold leading-6 text-foreground"
          >
            Bật thông báo để không lỡ nhiệm vụ
          </h2>
        </div>

        <p
          id="push-permission-popup-description"
          className="mt-4 text-sm leading-6 text-muted-foreground"
        >
          {isDenied
            ? "Trình duyệt đang chặn thông báo. Hãy bật lại trong cài đặt trình duyệt để nhận nhắc task."
            : "Ubuntu sẽ nhắc task hằng ngày và báo ngay khi có quà hoặc cập nhật quan trọng."}
        </p>

        {message ? (
          <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-background/60 px-4 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-overlay-medium"
            onClick={dismiss}
            type="button"
          >
            Để sau
          </button>
          {isDenied ? (
            <Link
              className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity duration-200 hover:opacity-90"
              href="/profile"
              onClick={dismiss}
            >
              Mở hồ sơ
            </Link>
          ) : (
            <button
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={handleSubscribe}
              type="button"
            >
              {loading ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing aria-hidden className="h-4 w-4" />
              )}
              Bật thông báo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
