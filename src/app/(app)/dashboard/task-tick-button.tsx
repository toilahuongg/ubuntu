"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { StreakBonusPopup } from "@/app/(app)/tasks/streak-bonus-popup";
import {
  submitTaskViaApi,
  type StreakBonusResult,
} from "@/lib/tasks/client-submit";
import { resolveDashboardTickState } from "@/lib/tasks/dashboard-tick-state";
import type { TaskStatus } from "@/lib/tasks/types";
import type { TaskType } from "@/lib/tasks/constants";

export function TaskTickButton({
  taskId,
  subjectUserId,
  myCompletionCount,
  status,
  isGoalComplete = false,
  taskType,
  weeklyCompletion,
  maxPerWeek,
}: {
  taskId: string;
  subjectUserId: string;
  myCompletionCount: number;
  status: TaskStatus;
  isGoalComplete?: boolean;
  taskType?: TaskType;
  weeklyCompletion?: number;
  maxPerWeek?: number | null;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticCount, setOptimisticCount] = useState(myCompletionCount);
  const [streakBonus, setStreakBonus] = useState<StreakBonusResult | null>(
    null,
  );

  useEffect(() => {
    setOptimisticCount(myCompletionCount);
  }, [myCompletionCount]);

  const tickState = resolveDashboardTickState({
    isGoalComplete,
    isPending,
    maxPerWeek,
    optimisticCount,
    status,
    taskType,
    weeklyCompletion,
  });

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (tickState.disabled) return;
    setError(null);
    const previousCount = optimisticCount;
    setOptimisticCount(tickState.nextCount);
    setIsPending(true);
    void (async () => {
      const result = await submitTaskViaApi({
        taskId,
        subjectUserId,
        count: tickState.submitCount,
        mode: tickState.submitMode,
      });
      if (result.status === "error") {
        setOptimisticCount(previousCount);
        setError(result.message);
      } else if (result.status === "timeout_unknown") {
        setError(result.message);
        window.setTimeout(() => router.refresh(), 1200);
      } else {
        if (result.data?.streakBonus?.awarded) {
          setStreakBonus(result.data.streakBonus);
        }
        router.refresh();
      }
      setIsPending(false);
    })();
  }

  const label = tickState.isDone
    ? taskType === "COUNT_TOTAL"
      ? "Đánh dấu thêm lượt cầu nguyện"
      : tickState.isWeeklyTask
        ? "Bỏ hoàn thành tuần này"
      : taskType === "MONTHLY_PER_MEMBER"
        ? "Đã hoàn thành tháng này"
      : "Bỏ hoàn thành"
    : isGoalComplete
      ? "Đã đạt mục tiêu"
      : tickState.isLocked || tickState.isTaskCompleted
        ? "Đã khoá"
        : "Đánh dấu hoàn thành";

  if (!tickState.shouldRenderButton) {
    return <div className="h-9 w-9 shrink-0" aria-hidden />;
  }

  return (
    <div className="flex flex-col items-center">
      <StreakBonusPopup
        bonus={streakBonus}
        onClose={() => setStreakBonus(null)}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={tickState.disabled}
        aria-label={label}
        title={error ?? label}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
          tickState.shouldRenderChecked
            ? "border-primary bg-primary text-background"
            : tickState.isLocked || tickState.isTaskCompleted
              ? "border-border bg-muted text-muted-foreground"
              : "border-border bg-background hover:border-primary hover:bg-primary/10"
        } ${isPending ? "opacity-70" : ""} disabled:cursor-not-allowed`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : tickState.shouldRenderChecked ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <span className="h-4 w-4 rounded-full" aria-hidden />
        )}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-center text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
