"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  const isStandalone = useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === "undefined") return false;

      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error iOS Safari-specific
        window.navigator.standalone === true
      );
    },
    () => false,
  );

  const isIOS = useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === "undefined") return false;

      const ua = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    },
    () => false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration("/").then((existing) => {
        if (!existing) navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isStandalone || installed) return null;

  // Hide inside Telegram WebApp — install is irrelevant there.
  if (typeof window !== "undefined" && "Telegram" in window) {
    if (window.Telegram?.WebApp?.initData) return null;
  }

  const canPrompt = Boolean(promptEvent);

  if (!canPrompt && !isIOS) return null;

  const handleClick = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }
    if (isIOS) setShowIOSHint((v) => !v);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90"
      >
        <Download className="h-4 w-4" />
        Tải app về máy
      </button>
      {isIOS && showIOSHint && (
        <div className="rounded-xl bg-overlay-subtle px-4 py-3 text-xs text-muted-foreground">
          <p className="mb-1 flex items-center gap-1 font-medium text-foreground">
            <Share className="h-3.5 w-3.5" /> Trên iOS Safari
          </p>
          <p>
            Nhấn nút Chia sẻ, chọn <span className="font-medium">Thêm vào Màn hình chính</span> để cài Ubuntu như ứng dụng.
          </p>
        </div>
      )}
    </div>
  );
}
