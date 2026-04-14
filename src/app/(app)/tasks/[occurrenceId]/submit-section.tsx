"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Send } from "lucide-react";
import type { SerializedUser } from "@/lib/domain";
import { submitTaskAction } from "@/app/(app)/actions";

export function SubmitSection({
  occurrenceId,
  allowedSubjects,
  selectedSubject,
  myCompletionCount,
  status,
}: {
  occurrenceId: string;
  allowedSubjects: SerializedUser[];
  selectedSubject: SerializedUser;
  myCompletionCount: number;
  status: "OPEN" | "CLOSED";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentSubjectId, setCurrentSubjectId] = useState(selectedSubject.id);

  function handleSubjectChange(subjectId: string) {
    setCurrentSubjectId(subjectId);
    router.replace(`/tasks/${occurrenceId}?subject=${subjectId}`);
  }

  function handleSubmit() {
    startTransition(async () => {
      await submitTaskAction(occurrenceId, currentSubjectId);
      router.refresh();
    });
  }

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Subject selector */}
      {allowedSubjects.length > 1 && (
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
      )}

      {/* Completion count */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {allowedSubjects.length > 1
              ? selectedSubject.fullName
              : "Số lần hoàn thành"}
          </p>
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

      {/* Submit button */}
      <button
        type="button"
        disabled={isPending || status === "CLOSED"}
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
            {status === "CLOSED" ? "Đã đóng" : "Nộp nhiệm vụ"}
          </>
        )}
      </button>
    </div>
  );
}
