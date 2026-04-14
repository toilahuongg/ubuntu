"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Send } from "lucide-react";

import { submitTaskAction } from "@/app/(app)/tasks/actions";
import type { TaskStatus } from "@/lib/tasks/types";

export function SubmitSection({
  taskId,
  subjectUserId,
  myCompletionCount,
  status,
}: {
  taskId: string;
  subjectUserId: string;
  myCompletionCount: number;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitTaskAction(taskId, subjectUserId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const isLocked = status === "LOCKED" || status === "COMPLETED";
  const isCompleted = status === "COMPLETED";

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Số lần hoàn thành hôm nay</p>
          <p className="text-xs text-muted-foreground">
            Đã nộp {myCompletionCount} lần
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

      <button
        type="button"
        disabled={isPending || isLocked}
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
            {isCompleted ? "Đã hoàn thành" : isLocked ? "Đã khoá" : "Nộp nhanh hôm nay"}
          </>
        )}
      </button>
    </div>
  );
}
