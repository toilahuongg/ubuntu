"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

import { type PushSubscribeResult, useWebPush } from "@/lib/push/use-web-push";

function getSubscribeErrorMessage(
  result: Extract<PushSubscribeResult, { ok: false }>,
) {
  const { reason } = result;

  if (reason === "denied") {
    return "iPhone đang chặn thông báo cho app này. Hãy bật lại trong Cài đặt.";
  }
  if (reason === "unsupported") {
    return "Trên iPhone, hãy mở app đã cài trên Home Screen để bật thông báo.";
  }
  if (reason === "ios_not_installed") {
    return "Trên iPhone, hãy mở Ubuntu từ icon Home Screen rồi bật thông báo.";
  }
  if (reason === "unconfigured") {
    return "Thông báo đẩy chưa được cấu hình trên server.";
  }
  if (reason === "unauthorized") {
    return "Phiên đăng nhập trong app Home Screen đã hết hạn. Hãy đăng nhập lại trong Ubuntu rồi bật thông báo.";
  }
  if (reason === "bad_request") {
    return result.message
      ? `Server từ chối subscription: ${result.message}`
      : "Server từ chối subscription. Vui lòng thử đăng nhập lại rồi bật thông báo.";
  }
  if (reason === "server_error") {
    return result.message
      ? `Chưa lưu được thiết bị nhận thông báo: ${result.message}`
      : "Chưa lưu được thiết bị nhận thông báo. Vui lòng thử lại.";
  }
  if (reason === "not_allowed") {
    return "iPhone chưa cho phép đăng ký Web Push. Hãy mở app từ Home Screen rồi bật lại.";
  }
  if (reason === "invalid_key") {
    return "VAPID key của thông báo đẩy chưa hợp lệ. Cần kiểm tra cấu hình server.";
  }
  if (reason === "service_worker") {
    return "Service worker chưa sẵn sàng. Hãy đóng mở lại app rồi bật lại.";
  }
  return "Chưa thể bật thông báo lúc này. Vui lòng thử lại.";
}

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const { status, loading, subscribe, unsubscribe } = useWebPush();
  const [message, setMessage] = useState<string | null>(null);

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

  if (status === "ios_not_installed") {
    return (
      <div
        className={`flex min-h-24 items-start gap-3 p-4 text-sm text-muted-foreground ${
          compact
            ? "rounded-2xl border border-sky-400/20 bg-sky-400/10"
            : "glass-card"
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-primary ring-1 ring-sky-400/25">
          <BellOff className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Thông báo đẩy</p>
          <p className="mt-1 text-xs leading-5">
            Trên iPhone, thông báo chỉ bật được khi mở Ubuntu từ icon đã cài
            trên Home Screen.
          </p>
        </div>
      </div>
    );
  }

  if (status === "unconfigured") {
    return null;
  }

  const isOn = status === "subscribed";

  const handleToggle = async () => {
    setMessage(null);
    if (isOn) {
      const result = await unsubscribe();
      if (!result.ok) {
        setMessage("Chưa thể tắt thông báo lúc này. Vui lòng thử lại.");
      }
      return;
    }

    const result = await subscribe();
    if (!result.ok) {
      setMessage(getSubscribeErrorMessage(result));
    }
  };

  return (
    <div
      className={`flex min-h-24 flex-col justify-center gap-3 p-4 ${
        compact
          ? isOn
            ? "rounded-2xl border border-emerald-400/25 bg-emerald-400/10"
            : "rounded-2xl border border-sky-400/20 bg-sky-400/10"
          : "glass-card"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-3">
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
          onClick={handleToggle}
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
      {message ? (
        <p className="w-full rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
