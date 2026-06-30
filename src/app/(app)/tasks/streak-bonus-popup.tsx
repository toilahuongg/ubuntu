"use client";

import { Trophy, X } from "lucide-react";

import type { StreakBonusResult } from "@/lib/tasks/client-submit";

export function StreakBonusPopup({
  bonus,
  onClose,
}: {
  bonus: StreakBonusResult | null;
  onClose: () => void;
}) {
  if (!bonus?.awarded) return null;

  const rewards = [
    bonus.bonusExp > 0 ? `+${bonus.bonusExp} XP` : null,
    bonus.bonusPoints > 0 ? `+${bonus.bonusPoints} điểm` : null,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
    >
      <div
        aria-modal="true"
        role="dialog"
        className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div
            aria-hidden
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"
          >
            <Trophy className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Hoàn thành chuỗi {bonus.milestone} ngày</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bạn nhận thêm {rewards.join(" và ")}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thông báo"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-overlay-subtle hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-10 w-full rounded-md border border-border bg-overlay-subtle text-sm font-medium hover:bg-overlay-medium"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
