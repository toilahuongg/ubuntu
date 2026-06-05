"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { submitTaskViaApi } from "@/lib/tasks/client-submit";
import type { TaskStatus } from "@/lib/tasks/types";
import type { TaskType } from "@/lib/tasks/constants";

export function TaskTickButton({
  taskId,
  subjectUserId,
  myCompletionCount,
  status,
  isGoalComplete = false,
  taskType,
}: {
  taskId: string;
  subjectUserId: string;
  myCompletionCount: number;
  status: TaskStatus;
  isGoalComplete?: boolean;
  taskType?: TaskType;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticCount, setOptimisticCount] = useState(myCompletionCount);

  useEffect(() => {
    setOptimisticCount(myCompletionCount);
  }, [myCompletionCount]);

  const isLocked = status === "LOCKED";
  const isDone = optimisticCount > 0;
  const isTaskCompleted = status === "COMPLETED";
  const disabled =
    isPending ||
    isLocked ||
    isGoalComplete ||
    (isTaskCompleted && !isDone);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setError(null);
    const previousCount = optimisticCount;
    const isCountTotal = taskType === "COUNT_TOTAL";
    const nextCount = isCountTotal
      ? previousCount + 1
      : isDone ? 0 : Math.max(1, previousCount);
    setOptimisticCount(nextCount);
    setIsPending(true);
    void (async () => {
      const result = await submitTaskViaApi({
        taskId,
        subjectUserId,
        count: isCountTotal ? 1 : (isDone ? 0 : undefined),
        mode: isCountTotal ? "increment" : (isDone ? "set" : undefined),
      });
      if (result.status === "error") {
        setOptimisticCount(previousCount);
        setError(result.message);
      } else if (result.status === "timeout_unknown") {
        setError(result.message);
        window.setTimeout(() => router.refresh(), 1200);
      } else {
        router.refresh();
      }
      setIsPending(false);
    })();
  }

  const label = isDone
    ? taskType === "COUNT_TOTAL"
      ? "Đánh dấu thêm lượt cầu nguyện"
      : "Bỏ hoàn thành"
    : isGoalComplete
      ? "Đã đạt mục tiêu"
      : isLocked || isTaskCompleted
        ? "Đã khoá"
        : "Đánh dấu hoàn thành";

  if (isGoalComplete) {
    return <div className="h-9 w-9 shrink-0" aria-hidden />;
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={label}
        title={error ?? label}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
          isDone
            ? "border-primary bg-primary text-background"
            : isLocked || isTaskCompleted
              ? "border-border bg-muted text-muted-foreground"
              : "border-border bg-background hover:border-primary hover:bg-primary/10"
        } ${isPending ? "opacity-70" : ""} disabled:cursor-not-allowed`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : isDone ? (
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
