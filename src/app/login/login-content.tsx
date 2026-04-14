"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";

type TelegramWidgetUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(
    searchParams.get("error"),
  );
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);

  const handleLoginResult = useCallback(
    (res: Response, data: { error?: string; status?: string }) => {
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Đăng nhập thất bại.");
        return;
      }

      if (data.status === "PENDING") {
        router.replace("/onboarding/select-region");
      } else {
        router.replace("/dashboard");
      }
    },
    [router],
  );

  useEffect(() => {
    const w = window as unknown as {
      Telegram?: { WebApp?: { initData?: string; ready?: () => void } };
    };
    const tg = w.Telegram?.WebApp;

    if (tg?.initData) {
      setIsTelegramWebApp(true);
      tg.ready?.();
      handleTelegramWebAppLogin(tg.initData);
    }
  }, []);

  async function handleTelegramWebAppLogin(initData: string) {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });
      const data = await res.json();
      handleLoginResult(res, data);
    } catch {
      setStatus("error");
      setError("Không thể kết nối máy chủ.");
    }
  }

  const handleWidgetLogin = useCallback(
    async (user: TelegramWidgetUser) => {
      setStatus("loading");
      setError(null);

      try {
        const res = await fetch("/api/auth/telegram/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        const data = await res.json();
        handleLoginResult(res, data);
      } catch {
        setStatus("error");
        setError("Không thể kết nối máy chủ.");
      }
    },
    [handleLoginResult],
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      {/* Decorative orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Nhiệm Vụ Mỗi Ngày
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Quản lý nhiệm vụ hàng ngày
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="glass-card p-6">
          {status === "loading" ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <p className="text-sm text-muted-foreground">
                Đang xác thực qua Telegram...
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {!isTelegramWebApp && (
                <TelegramLoginButton onAuth={handleWidgetLogin} />
              )}

              {isTelegramWebApp && (
                <p className="text-center text-sm text-muted-foreground">
                  Đang đăng nhập qua Telegram...
                </p>
              )}

              {error && (
                <div className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function TelegramLoginButton({
  onAuth,
}: {
  onAuth: (user: TelegramWidgetUser) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername || !containerRef.current) return;

    // Expose the callback globally for the Telegram widget script
    const callbackName = "__onTelegramAuth";
    (window as unknown as Record<string, unknown>)[callbackName] = onAuth;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    script.setAttribute("data-request-access", "write");
    containerRef.current.appendChild(script);

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      script.remove();
    };
  }, [onAuth]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-center text-sm text-muted-foreground">
        Đăng nhập bằng tài khoản Telegram
      </p>
      <div ref={containerRef} />
    </div>
  );
}

