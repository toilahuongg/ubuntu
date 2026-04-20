"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";

import { InstallAppButton } from "@/components/install-app-button";
import { promptWebPushOnce } from "@/lib/push/prompt-once";

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

      const target =
        data.status === "PENDING" ? "/onboarding" : "/dashboard";
      // Use a hard navigation so the just-set session cookie is picked up
      // reliably by the destination route (soft RSC navigation can race with
      // Set-Cookie processing in some WebViews, leaving the user stuck).
      promptWebPushOnce().finally(() => {
        window.location.assign(target);
      });
    },
    [],
  );

  const handleTelegramWebAppLogin = useCallback(
    async (initData: string) => {
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
    },
    [handleLoginResult],
  );

  useEffect(() => {
    // Telegram WebApp injects window.Telegram.WebApp via telegram-web-app.js
    // (loaded in root layout). On slow devices the object may appear a few
    // ticks after mount — poll briefly before giving up and showing the
    // widget fallback.
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // ~2s total

    const tick = () => {
      if (cancelled) return;
      const w = window as unknown as {
        Telegram?: { WebApp?: { initData?: string; ready?: () => void } };
      };
      const tg = w.Telegram?.WebApp;

      if (tg && typeof tg.initData === "string" && tg.initData.length > 0) {
        setIsTelegramWebApp(true);
        tg.ready?.();
        handleTelegramWebAppLogin(tg.initData);
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        setTimeout(tick, 100);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [handleTelegramWebAppLogin]);

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
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-overlay-subtle blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-overlay-subtle blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-overlay-medium backdrop-blur-sm">
            <Image
              src="/icons/logo.svg"
              alt="Ubuntu"
              width={40}
              height={40}
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Ubuntu
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
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
              <p className="text-sm text-muted-foreground">
                Đang xác thực qua Telegram...
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {!isTelegramWebApp && (
                <>
                  <TelegramLoginButton onAuth={handleWidgetLogin} />
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      hoặc
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <GoogleLoginButton />
                </>
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

        <div className="mt-4">
          <InstallAppButton />
        </div>
      </div>
    </main>
  );
}

function GoogleLoginButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-overlay-subtle"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.6 14.7 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12S6.9 21.3 12 21.3c6.9 0 9.2-4.9 9.2-9 0-.6-.1-1-.2-1.5H12z"
        />
      </svg>
      <span>Đăng nhập bằng Google</span>
    </button>
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

