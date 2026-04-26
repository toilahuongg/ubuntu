"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";

import { useWebPush } from "@/lib/push/use-web-push";

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const { status, loading, subscribe, unsubscribe } = useWebPush();

  if (status === "checking") {
    return null;
  }

  if (status === "unsupported") {
    return (
      <div
        className={`flex min-h-24 items-start gap-3 p-4 text-sm text-muted-foreground ${
          compact
            ? "rounded-2xl border border-border bg-overlay-subtle"
            : "glass-card"
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-overlay-medium text-muted-foreground ring-1 ring-border">
          <BellOff className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Thông báo đẩy</p>
          <p className="mt-1 text-xs leading-5">
            Trình duyệt hiện tại không hỗ trợ Web Push. Trên iOS, hãy cài ứng dụng
            lên Home Screen.
          </p>
        </div>
      </div>
    );
  }

  if (status === "unconfigured") {
    return null;
  }

  const isOn = status === "subscribed";

  return (
    <div
      className={`flex min-h-24 items-center justify-between gap-3 p-4 ${
        compact
          ? isOn
            ? "rounded-2xl border border-emerald-400/25 bg-emerald-400/10"
            : "rounded-2xl border border-sky-400/20 bg-sky-400/10"
          : "glass-card"
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
            isOn
              ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/25"
              : "bg-sky-400/15 text-primary ring-sky-400/25"
          }`}
        >
          {isOn ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Thông báo đẩy</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {status === "denied"
              ? "Bạn đã chặn thông báo. Hãy bật lại trong cài đặt trình duyệt."
              : isOn
                ? "Nhận nhắc task và quà tặng ngay trên thiết bị này."
                : "Bật để nhận nhắc task và thông báo admin tặng quà."}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={loading || status === "denied"}
        onClick={() => (isOn ? unsubscribe() : subscribe())}
        className={`flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isOn
            ? "border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/10"
            : "border-primary/30 text-primary hover:bg-primary/10"
        }`}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {isOn ? "Tắt" : "Bật"}
      </button>
    </div>
  );
}
