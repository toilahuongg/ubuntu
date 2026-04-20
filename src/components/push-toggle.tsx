"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";

import { useWebPush } from "@/lib/push/use-web-push";

export function PushToggle() {
  const { status, loading, subscribe, unsubscribe } = useWebPush();

  if (status === "unsupported") {
    return (
      <div className="glass-card flex items-start gap-3 p-4 text-sm text-muted-foreground">
        <BellOff className="mt-0.5 h-4 w-4" />
        <div>
          <p className="font-medium text-foreground">Thông báo đẩy</p>
          <p>Trình duyệt hiện tại không hỗ trợ Web Push. Trên iOS, hãy cài ứng dụng lên Home Screen.</p>
        </div>
      </div>
    );
  }

  if (status === "unconfigured") {
    return null;
  }

  const isOn = status === "subscribed";

  return (
    <div className="glass-card flex items-center justify-between gap-3 p-4">
      <div className="flex items-start gap-3">
        {isOn ? (
          <Bell className="mt-0.5 h-4 w-4 text-primary" />
        ) : (
          <BellOff className="mt-0.5 h-4 w-4 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">Thông báo đẩy</p>
          <p className="text-xs text-muted-foreground">
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
        className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-primary/30 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {isOn ? "Tắt" : "Bật"}
      </button>
    </div>
  );
}
