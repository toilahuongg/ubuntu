"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { submitTaskAction } from "@/app/(app)/tasks/actions";
import type { TaskStatus } from "@/lib/tasks/types";

export function TaskTickButton({
  taskId,
  subjectUserId,
  myCompletionCount,
  status,
  isGoalComplete = false,
}: {
  taskId: string;
  subjectUserId: string;
  myCompletionCount: number;
  status: TaskStatus;
  isGoalComplete?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isLocked = status === "LOCKED";
  const isDone = myCompletionCount > 0;
  const isTaskCompleted = status === "COMPLETED";
  const disabled =
    isPending || isLocked || isGoalComplete || (isTaskCompleted && !isDone);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setError(null);
    startTransition(async () => {
      const result = isDone
        ? await submitTaskAction(taskId, subjectUserId, undefined, 0, "set")
        : await submitTaskAction(taskId, subjectUserId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const label = isDone
    ? "Bỏ hoàn thành"
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
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </div>
  );
}
