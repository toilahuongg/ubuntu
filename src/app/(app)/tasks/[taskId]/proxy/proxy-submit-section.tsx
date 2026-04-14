"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Send } from "lucide-react";

import type { SessionUser } from "@/lib/domain";
import { submitTaskAction } from "@/app/(app)/tasks/actions";
import type { BackfillDay, TaskStatus } from "@/lib/tasks/types";

export function ProxySubmitSection({
  taskId,
  allowedSubjects,
  selectedSubject,
  myCompletionCount,
  status,
  backfillDays,
}: {
  taskId: string;
  allowedSubjects: SessionUser[];
  selectedSubject: SessionUser;
  myCompletionCount: number;
  status: TaskStatus;
  backfillDays: BackfillDay[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentSubjectId, setCurrentSubjectId] = useState(selectedSubject.id);
  const [error, setError] = useState<string | null>(null);
  const [pendingDateKey, setPendingDateKey] = useState<string | null>(null);

  function handleSubjectChange(subjectId: string) {
    setCurrentSubjectId(subjectId);
    setError(null);
    router.replace(`/tasks/${taskId}/proxy?subject=${subjectId}`);
  }

  function handleSubmit(dateKey?: string) {
    setError(null);
    setPendingDateKey(dateKey ?? null);
    startTransition(async () => {
      const result = await submitTaskAction(taskId, currentSubjectId, dateKey);
      setPendingDateKey(null);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const isLocked = status === "LOCKED" || status === "COMPLETED";
  const isCompleted = status === "COMPLETED";
  const todayPending = isPending && pendingDateKey === null;

  return (
    <div className="glass-card p-4 space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Nộp cho
        </label>
        <select
          value={currentSubjectId}
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="form-select"
        >
          {allowedSubjects.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{selectedSubject.fullName}</p>
          <p className="text-xs text-muted-foreground">
            Đã nộp {myCompletionCount} lần hôm nay
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
        aria-busy={todayPending}
        onClick={() => handleSubmit()}
        className="btn-gradient flex h-11 w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {todayPending ? (
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
            {isCompleted ? "Đã hoàn thành" : isLocked ? "Đã khoá" : "Nộp hộ"}
          </>
        )}
      </button>

      {backfillDays.length > 0 && !isCompleted && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Nhập bù (không gửi thông báo)
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {backfillDays.map((day) => {
              const submitted = day.completionCount > 0;
              const pending = isPending && pendingDateKey === day.dateKey;
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSubmit(day.dateKey)}
                  title={formatBackfillTitle(day.dateKey, day.completionCount)}
                  aria-busy={pending}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    submitted
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-overlay-subtle hover:bg-overlay-medium"
                  }`}
                >
                  {pending ? (
                    <span
                      aria-hidden
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground"
                    />
                  ) : (
                    <>
                      <span className="font-semibold">
                        {day.dateKey.slice(8, 10)}
                      </span>
                      <span className="text-[9px] opacity-70">
                        {day.dateKey.slice(5, 7)}
                      </span>
                      {submitted && (
                        <Check className="mt-0.5 h-2.5 w-2.5" aria-hidden />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBackfillTitle(dateKey: string, count: number) {
  const label = count > 0 ? `đã nộp ${count} lần` : "chưa nộp";
  return `${dateKey} — ${label}`;
}
