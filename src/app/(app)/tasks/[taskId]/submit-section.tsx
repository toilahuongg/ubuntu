"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Send } from "lucide-react";

import { submitTaskViaApi } from "@/lib/tasks/client-submit";
import { isDailyTaskType, type TaskType } from "@/lib/tasks/constants";
import type { TaskStatus } from "@/lib/tasks/types";

export function SubmitSection({
  taskId,
  subjectUserId,
  myCompletionCount,
  status,
  taskType,
}: {
  taskId: string;
  subjectUserId: string;
  myCompletionCount: number;
  status: TaskStatus;
  taskType: TaskType;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        setSuccess(
          alreadySubmittedToday
            ? "Đã bỏ hoàn thành hôm nay."
            : "Đã nộp hoàn thành hôm nay.",
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
  const alreadySubmittedToday = isDaily && myCompletionCount > 0;
  const submitDisabled = isPending || (isLocked && !alreadySubmittedToday);
  const submitLabel = isCompleted
    ? "Đã hoàn thành"
    : alreadySubmittedToday
      ? "Bỏ hoàn thành hôm nay"
      : isLocked
      ? "Đã khoá"
      : "Nộp nhanh hôm nay";

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {isDaily ? "Hoàn thành hôm nay" : "Số lần hoàn thành hôm nay"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isDaily
              ? myCompletionCount > 0
                ? "Đã nộp hôm nay"
                : "Chưa nộp hôm nay"
              : `Đã nộp ${myCompletionCount} lần`}
          </p>
        </div>
        {myCompletionCount > 0 && (
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

      {success && !error && <p className="text-xs text-primary">{success}</p>}

      <button
        type="button"
        disabled={submitDisabled}
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
