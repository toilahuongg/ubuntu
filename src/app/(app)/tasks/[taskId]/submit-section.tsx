"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Send } from "lucide-react";

import { StreakBonusPopup } from "@/app/(app)/tasks/streak-bonus-popup";
import {
  submitTaskViaApi,
  type StreakBonusResult,
} from "@/lib/tasks/client-submit";
import {
  getTaskSubmitCopy,
  isDailyTaskType,
  type TaskType,
} from "@/lib/tasks/constants";
import type { TaskStatus } from "@/lib/tasks/types";

export function SubmitSection({
  taskId,
  subjectUserId,
  myCompletionCount,
  monthlyCompletion,
  weeklyCompletion,
  maxPerWeek,
  status,
  taskType,
}: {
  taskId: string;
  subjectUserId: string;
  myCompletionCount: number;
  monthlyCompletion: number;
  weeklyCompletion?: number;
  maxPerWeek?: number | null;
  status: TaskStatus;
  taskType: TaskType;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [streakBonus, setStreakBonus] = useState<StreakBonusResult | null>(
    null,
  );

  function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (submitDisabled) return;
    setIsPending(true);
    void (async () => {
      const result = await submitTaskViaApi({
        taskId,
        subjectUserId,
        count: alreadySubmittedToday ? 0 : undefined,
        mode: alreadySubmittedToday ? "set" : undefined,
      });
      if (result.status === "success") {
        if (result.data?.streakBonus?.awarded) {
          setStreakBonus(result.data.streakBonus);
        }
        setSuccess(
          alreadySubmittedToday
            ? "Đã bỏ hoàn thành hôm nay."
            : copy.successLabel,
        );
        router.refresh();
      } else if (result.status === "timeout_unknown") {
        setSuccess(result.message);
        window.setTimeout(() => router.refresh(), 1200);
      } else {
        setError(result.message);
      }
      setIsPending(false);
    })();
  }

  const isLocked = status === "LOCKED" || status === "COMPLETED";
  const isCompleted = status === "COMPLETED";
  const isDaily = isDailyTaskType(taskType);
  const isMonthly = taskType === "MONTHLY_PER_MEMBER";
  const copy = getTaskSubmitCopy(taskType);
  const alreadySubmittedToday = isDaily && myCompletionCount > 0;
  const alreadyCompletedPeriod =
    isMonthly && monthlyCompletion > 0 && !alreadySubmittedToday;
  const displayCount = isMonthly ? monthlyCompletion : myCompletionCount;
  const submitDisabled =
    isPending || alreadyCompletedPeriod || (isLocked && !alreadySubmittedToday);
  const weeklyLimitReached =
    taskType === "WEEKLY_PER_MEMBER" &&
    maxPerWeek != null &&
    (weeklyCompletion ?? 0) >= maxPerWeek;
  const weeklySubmitDisabled = submitDisabled || weeklyLimitReached;
  const submitLabel = isCompleted
    ? "Đã hoàn thành"
    : alreadyCompletedPeriod
      ? copy.completedLabel
    : alreadySubmittedToday
      ? "Bỏ hoàn thành hôm nay"
      : isLocked
        ? "Đã khoá"
        : copy.actionLabel;

  return (
    <div className="glass-card p-4 space-y-4">
      <StreakBonusPopup
        bonus={streakBonus}
        onClose={() => setStreakBonus(null)}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {copy.heading}
          </p>
          <p className="text-xs text-muted-foreground">
            {displayCount > 0
              ? copy.countLabel(displayCount)
              : copy.pendingLabel}
          </p>
          {taskType === "WEEKLY_PER_MEMBER" && maxPerWeek != null && (
            <p className="text-xs text-muted-foreground">
              Đã {weeklyCompletion ?? 0}/{maxPerWeek} lượt tuần này
            </p>
          )}
        </div>
        {displayCount > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-overlay-medium">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {weeklyLimitReached && !error && (
        <p className="text-xs text-muted-foreground">
          Đã đạt giới hạn tuần này ({maxPerWeek} lượt).
        </p>
      )}

      {success && !error && <p className="text-xs text-primary">{success}</p>}

      <button
        type="button"
        disabled={weeklySubmitDisabled}
        aria-busy={isPending}
        onClick={handleSubmit}
        className="btn-gradient flex h-11 w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background"
            />
            Đang nộp…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden />
            {submitLabel}
          </>
        )}
      </button>
    </div>
  );
}
