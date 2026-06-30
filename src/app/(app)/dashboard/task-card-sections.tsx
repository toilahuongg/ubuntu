"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronRight, Clock } from "lucide-react";

import { TASK_TYPE_LABELS } from "@/lib/tasks/constants";
import type { TaskCard } from "@/lib/tasks/types";
import { TaskProgressBadge } from "./task-progress-badge";
import { TaskTickButton } from "./task-tick-button";

type TaskSectionVariant = "member" | "leader";
type TaskSectionTab = "pending" | "done";

export function TaskCardSection({
  title,
  cards,
  userId,
  variant,
}: {
  title: string;
  cards: TaskCard[];
  userId: string;
  variant: TaskSectionVariant;
}) {
  const pendingCards = cards.filter((card) => !isCardDone(card));
  const doneCards = cards.filter((card) => isCardDone(card));
  const [activeTab, setActiveTab] = useState<TaskSectionTab>(
    pendingCards.length > 0 ? "pending" : "done",
  );

  if (cards.length === 0) return null;

  const resolvedTab =
    activeTab === "pending" && pendingCards.length === 0 && doneCards.length > 0
      ? "done"
      : activeTab === "done" && doneCards.length === 0 && pendingCards.length > 0
        ? "pending"
        : activeTab;
  const visibleCards = resolvedTab === "pending" ? pendingCards : doneCards;
  const emptyText =
    resolvedTab === "pending"
      ? "Không còn nhiệm vụ nào chưa xong."
      : "Chưa có nhiệm vụ nào đã xong.";

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <div className="inline-flex rounded-full bg-overlay-subtle p-1 ring-1 ring-border">
          <TabButton
            active={resolvedTab === "pending"}
            onClick={() => setActiveTab("pending")}
          >
            Chưa xong ({pendingCards.length})
          </TabButton>
          <TabButton
            active={resolvedTab === "done"}
            onClick={() => setActiveTab("done")}
          >
            Đã xong ({doneCards.length})
          </TabButton>
        </div>
      </div>

      {visibleCards.length > 0 ? (
        <div className="stagger-children space-y-2">
          {visibleCards.map((card) => (
            <TaskCardRow
              key={card.id}
              card={card}
              userId={userId}
              variant={variant}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      )}
    </section>
  );
}

function TaskCardRow({
  card,
  userId,
  variant,
}: {
  card: TaskCard;
  userId: string;
  variant: TaskSectionVariant;
}) {
  const isGoalComplete = card.progress.isGoalComplete;

  return (
    <div
      className={`glass-card flex items-center gap-3 p-4 transition-colors ${
        isGoalComplete ? "dashboard-task-goal-complete" : ""
      }`}
    >
      {card.isApplicableToActor ? (
        <TaskTickButton
          taskId={card.id}
          subjectUserId={userId}
          myCompletionCount={card.myCompletionCount}
          status={card.status}
          isGoalComplete={isGoalComplete}
          taskType={card.taskType}
        />
      ) : (
        <div className="h-9 w-9 shrink-0" aria-hidden />
      )}

      <Link
        href={`/tasks/${card.id}`}
        className="card-hover -m-2 flex min-w-0 flex-1 items-center justify-between rounded-xl p-2 active:bg-overlay-medium active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold" title={card.title}>
            {card.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5 text-[10px] font-semibold">
              {TASK_TYPE_LABELS[card.taskType]}
            </span>
            {variant === "member" || card.isApplicableToActor ? (
              <TaskProgressBadge progress={card.progress} />
            ) : null}
            {variant === "leader" ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {card.completionCount}/{card.totalCount}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {card.notificationTime}
            </span>
            {card.expReward > 0 && (
              <span
                className="rounded-full px-2 py-0.5 font-semibold"
                style={{
                  background: "var(--reward-soft)",
                  color:
                    "color-mix(in srgb, var(--reward) 82%, var(--foreground) 18%)",
                }}
              >
                +{card.expReward} XP
              </span>
            )}
            {variant === "member" && card.myCompletionCount > 0 && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{
                  background: "var(--success-soft)",
                  color:
                    "color-mix(in srgb, var(--success) 82%, var(--foreground) 18%)",
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                Đã nộp
              </span>
            )}
          </div>
        </div>
        <div className="ml-3 flex items-center gap-2">
          {variant === "leader" &&
            card.isApplicableToActor &&
            card.myCompletionCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold">
                {card.myCompletionCount}
              </span>
            )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function isCardDone(card: TaskCard) {
  if (
    card.taskType === "MONTHLY_PER_MEMBER" ||
    card.taskType === "WEEKLY_PER_MEMBER"
  ) {
    return card.progress.isGoalComplete;
  }
  if (card.taskType === "COUNT_TOTAL") {
    return card.progress.target !== null
      ? card.progress.isGoalComplete
      : card.myCompletionCount > 0;
  }
  return card.myCompletionCount > 0;
}
