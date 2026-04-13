"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, SendIcon, ShieldCheckIcon, SmartphoneIcon, ZapIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type TelegramLoginPanelProps = {
  botUsername?: string;
  isConfigured: boolean;
};

export function TelegramLoginPanel({
  botUsername,
  isConfigured,
}: TelegramLoginPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
  }, []);

  const handleTelegramLogin = () => {
    startTransition(async () => {
      setError(null);

      try {
        const initData = window.Telegram?.WebApp?.initData;

        if (!initData) {
          throw new Error(
            "Khong tim thay Telegram WebApp. Hay mo app tu bot Telegram.",
          );
        }

        const response = await fetch("/api/auth/telegram", {
          body: JSON.stringify({ initData }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Dang nhap Telegram that bai.");
        }

        router.push("/dashboard");
        router.refresh();
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Dang nhap Telegram that bai.",
        );
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(31,39,69,0.98),rgba(22,29,55,0.98))] p-6 text-white shadow-[0_30px_120px_rgba(15,23,42,0.24)] backdrop-blur">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
          Telegram WebApp
        </p>
        <h2 className="font-heading text-4xl font-semibold tracking-tight text-white">
          Dang nhap nhanh bang bot
        </h2>
        <p className="max-w-xl text-sm leading-7 text-slate-300">
          Nhan nut tu bot Telegram de vao web app, xac thuc bang `initData`, va
          bat dau cap nhat nhiem vu trong ngay.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { icon: ShieldCheckIcon, label: "InitData verified" },
          { icon: SmartphoneIcon, label: "Mobile-first flow" },
          { icon: ZapIcon, label: "Mo trong Telegram" },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <span
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-200"
            >
              <Icon className="size-3.5 text-cyan-200" />
              {item.label}
            </span>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          size="lg"
          onClick={handleTelegramLogin}
          disabled={pending || !isConfigured}
          className="bg-cyan-300 px-5 text-slate-950 shadow-[0_16px_36px_rgba(34,211,238,0.2)] hover:bg-cyan-200"
        >
          {pending ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <SendIcon />
          )}
          Dang nhap bang Telegram
        </Button>
        {botUsername ? (
          <a
            href={`https://t.me/${botUsername}?startapp=dashboard`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Mo bot tren Telegram
          </a>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {!isConfigured ? (
        <p className="mt-4 text-sm text-amber-200">
          App chua du env bat buoc. Cap nhat `.env.local` truoc khi dang nhap.
        </p>
      ) : null}
    </div>
  );
}
