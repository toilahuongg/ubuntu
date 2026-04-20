"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Clock, Plus, X } from "lucide-react";

import { submitTaskAction } from "@/app/(app)/tasks/actions";
import { ROLE_LABELS } from "@/lib/domain";
import { isDailyTaskType } from "@/lib/tasks/constants";
import type {
  DashboardRosterEntry,
  TaskCard,
} from "@/lib/tasks/types";

export function ZoneRoster({
  roster,
  cards,
}: {
  roster: DashboardRosterEntry[];
  cards: TaskCard[];
}) {
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);

  if (roster.length === 0) {
    return (
      <div className="glass-card py-8 text-center text-sm text-muted-foreground">
        Địa vực chưa có thành viên.
      </div>
    );
  }

  const cardById = new Map(cards.map((c) => [c.id, c]));

  return (
    <div className="space-y-2">
      {roster.map((member) => {
        const isOpen = openMemberId === member.id;
        const applicable = member.statuses.filter((s) => s.applicable);
        const completionPercent =
          applicable.length > 0
            ? Math.round((member.completed / applicable.length) * 100)
            : 0;
        // ZONE_LEAD and TEAM_LEAD rows cannot be proxy-submitted via
        // this view (policy forbids subordinates → superiors).
        const disableSubmit =
          member.role === "TEAM_LEAD" || member.role === "ZONE_LEAD";

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
                  {ROLE_LABELS[member.role] ?? member.role}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {member.completed}/{applicable.length}
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
                {member.statuses.map((status) => {
                  if (!status.applicable) return null;
                  const card = cardById.get(status.taskId);
                  if (!card) return null;
                  return (
                    <TaskRow
                      key={status.taskId}
                      disableSubmit={disableSubmit}
                      memberId={member.id}
                      card={card}
                      completionCount={status.completionCount}
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
  disableSubmit,
  memberId,
  card,
  completionCount,
}: {
  disableSubmit: boolean;
  memberId: string;
  card: TaskCard;
  completionCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    if (isPending || card.status === "LOCKED") return;
    startTransition(async () => {
      const result =
        isDailyTaskType(card.taskType) && completionCount > 0
          ? await submitTaskAction(card.id, memberId, undefined, 0, "set")
          : await submitTaskAction(card.id, memberId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const deadline = new Date(card.deadlineAt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isLocked = card.status === "LOCKED";
  const isDone = completionCount > 0;

  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{card.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {deadline}
            </span>
            {card.expReward > 0 && <span>+{card.expReward} XP</span>}
            {isDone && (
              <span className="font-medium text-foreground/70">
                × {completionCount}
              </span>
            )}
            {isLocked && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Đã khoá
              </span>
            )}
          </div>
        </div>
        {!disableSubmit && (
          <button
            type="button"
            disabled={isPending || isLocked}
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
                {isDailyTaskType(card.taskType) ? (
                  <X className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                {isDailyTaskType(card.taskType) ? "Bỏ tick" : "Nộp thêm"}
              </>
            ) : (
              <>
                <Check className="h-3 w-3" />
                Nộp hộ
              </>
            )}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
