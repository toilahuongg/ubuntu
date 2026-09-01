"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type { LeaderboardPeriod } from "@/lib/services/leaderboard-service";

const PERIOD_OPTIONS: { label: string; value: LeaderboardPeriod }[] = [
  { label: "Tuần", value: "week" },
  { label: "Tháng", value: "month" },
  { label: "Năm", value: "year" },
];

function formatKeyLabel(period: LeaderboardPeriod, key: string): string {
  if (period === "year") return key;
  if (period === "month") {
    const [year, month] = key.split("-");
    return `${month}/${year}`;
  }
  // Week key = ngày bắt đầu tuần (Thứ Bảy), hiển thị dd/MM
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

export function LeaderboardPeriodSelect({
  period,
  periodKey,
  selectableKeys,
}: {
  period: LeaderboardPeriod;
  periodKey: string;
  selectableKeys: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handlePeriodChange(nextPeriod: string) {
    if (nextPeriod === period) return;
    updateParams((params) => {
      params.set("period", nextPeriod);
      params.delete("key");
    });
  }

  function handleKeyChange(nextKey: string) {
    if (nextKey === periodKey) return;
    updateParams((params) => {
      params.set("period", period);
      params.set("key", nextKey);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div
        aria-busy={isPending}
        aria-label="Kỳ bảng xếp hạng"
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
      >
        {PERIOD_OPTIONS.map((option) => (
          <button
            aria-selected={option.value === period}
            className={`h-8 shrink-0 rounded-md border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-wait ${
              option.value === period
                ? "border-border bg-background text-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground"
            }`}
            disabled={isPending}
            key={option.value}
            onClick={() => handlePeriodChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <select
        aria-label="Chọn kỳ"
        className="h-8 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/35 disabled:cursor-wait"
        disabled={isPending}
        onChange={(event) => handleKeyChange(event.target.value)}
        value={periodKey}
      >
        {selectableKeys.map((key) => (
          <option key={key} value={key}>
            {formatKeyLabel(period, key)}
          </option>
        ))}
      </select>
    </div>
  );
}
