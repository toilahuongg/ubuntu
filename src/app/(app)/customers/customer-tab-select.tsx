"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { User, ShieldCheck } from "lucide-react";

export type CustomerTabValue = "personal" | "managed";

interface CustomerTabSelectProps {
  activeTab: CustomerTabValue;
  roleLabel?: string;
}

export function CustomerTabSelect({
  activeTab,
  roleLabel,
}: CustomerTabSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleTabChange = (tab: CustomerTabValue) => {
    if (tab === activeTab) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-muted/40 p-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleTabChange("personal")}
        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
          activeTab === "personal"
            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
        }`}
      >
        <User className="h-3.5 w-3.5" />
        Học viên của bản thân
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleTabChange("managed")}
        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
          activeTab === "managed"
            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
        }`}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span>Nơi quản lý {roleLabel ? `(${roleLabel})` : ""}</span>
      </button>
    </div>
  );
}
