"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Clock, Plus } from "lucide-react";

import { submitTaskAction } from "@/app/(app)/actions";
import { ROLE_LABELS } from "@/lib/domain";
import type { Role } from "@/lib/domain";

type Occurrence = {
  deadlineAt: string;
  expReward: number;
  id: string;
  status: "OPEN" | "CLOSED";
  title: string;
};

type Member = {
  completed: number;
  fullName: string;
  id: string;
  role: string;
  status: Array<{
    completionCount: number;
    occurrenceId: string;
  }>;
};

export function RegionRoster({
  members,
  occurrences,
}: {
  members: Member[];
  occurrences: Occurrence[];
}) {
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);

  if (members.length === 0) {
    return (
      <div className="glass-card py-8 text-center text-sm text-muted-foreground">
        Khu vực chưa có thành viên.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isOpen = openMemberId === member.id;
        const total = occurrences.length;
        const completionPercent =
          total > 0 ? Math.round((member.completed / total) * 100) : 0;

        return (
          <div key={member.id} className="glass-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenMemberId(isOpen ? null : member.id)}
              aria-expanded={isOpen}
              aria-label={`${member.fullName} — ${isOpen ? "thu gọn" : "mở rộng"}`}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-overlay-subtle"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.fullName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {ROLE_LABELS[member.role as Role] ?? member.role}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {member.completed}/{total}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {completionPercent}%
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isOpen && (
              <div className="divide-y divide-border border-t border-border">
                {occurrences.map((occurrence, idx) => {
                  const status = member.status[idx];
                  return (
                    <TaskRow
                      key={occurrence.id}
                      memberId={member.id}
                      occurrence={occurrence}
                      completionCount={status?.completionCount ?? 0}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({
  memberId,
  occurrence,
  completionCount,
}: {
  memberId: string;
  occurrence: Occurrence;
  completionCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      try {
        await submitTaskAction(occurrence.id, memberId);
        router.refresh();
      } catch (error) {
        console.error(error);
        alert(
          error instanceof Error ? error.message : "Không thể nộp nhiệm vụ.",
        );
      }
    });
  }

  const deadline = new Date(occurrence.deadlineAt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isClosed = occurrence.status === "CLOSED";
  const isDone = completionCount > 0;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{occurrence.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {deadline}
          </span>
          {occurrence.expReward > 0 && (
            <span>+{occurrence.expReward} XP</span>
          )}
          {isDone && (
            <span className="font-medium text-foreground/70">
              × {completionCount}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        disabled={isPending || isClosed}
        onClick={handleSubmit}
        className={`ml-3 flex h-9 min-w-[4rem] items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isDone
            ? "bg-overlay-medium text-foreground hover:bg-overlay-strong"
            : "bg-primary/15 text-foreground hover:bg-primary/25"
        }`}
      >
        {isPending ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
        ) : isDone ? (
          <>
            <Plus className="h-3 w-3" />
            Nộp thêm
          </>
        ) : (
          <>
            <Check className="h-3 w-3" />
            Nộp hộ
          </>
        )}
      </button>
    </div>
  );
}
