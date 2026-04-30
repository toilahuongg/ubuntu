"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Target, X } from "lucide-react";

import { MonthlyGoalForm } from "./monthly-goal-form";
import { ReminderSettingsForm } from "./reminder-settings-form";

type MonthlyGoalConfig = {
  taskId: string;
  yearMonth: string;
  currentGoal: number | null;
  unitLabel: string;
};

type ReminderConfig = {
  defaultReminderTime: string;
  effectiveReminderTime: string | null;
  initialEnabled: boolean;
  initialReminderTime: string;
  isCappedBeforeDeadline: boolean;
  taskId: string;
};

export function TaskDetailActions({
  monthlyGoal,
  reminder,
}: {
  monthlyGoal?: MonthlyGoalConfig;
  reminder?: ReminderConfig;
}) {
  const [openPanel, setOpenPanel] = useState<"goal" | "reminder" | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!openPanel) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPanel(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [openPanel]);

  useEffect(() => {
    if (!openPanel) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openPanel]);

  if (!monthlyGoal && !reminder) {
    return null;
  }

  const panelTitle =
    openPanel === "goal" ? "Mục tiêu tháng" : "Nhắc nhiệm vụ";
  const panelDescription =
    openPanel === "goal"
      ? "Đặt hoặc cập nhật mục tiêu tháng cho nhiệm vụ này."
      : "Chọn giờ nhắc và bật hoặc tắt nhắc riêng cho nhiệm vụ này.";
  const canUseDOM = typeof document !== "undefined";

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        {monthlyGoal && (
          <button
            type="button"
            onClick={() => setOpenPanel("goal")}
            aria-expanded={openPanel === "goal"}
            aria-haspopup="dialog"
            aria-controls={titleId}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-overlay-subtle px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-overlay-medium"
          >
            <Target className="h-4 w-4 text-primary" aria-hidden />
            Mục tiêu
          </button>
        )}
        {reminder && (
          <button
            type="button"
            onClick={() => setOpenPanel("reminder")}
            aria-expanded={openPanel === "reminder"}
            aria-haspopup="dialog"
            aria-controls={titleId}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-overlay-subtle px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-overlay-medium"
          >
            <Bell className="h-4 w-4 text-primary" aria-hidden />
            Nhắc nhở
          </button>
        )}
      </div>

      {canUseDOM && openPanel
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40 flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
                <button
                  type="button"
                  aria-label="Đóng popup thiết lập"
                  className="absolute inset-0 bg-background/45 backdrop-blur-[6px]"
                  onClick={() => setOpenPanel(null)}
                />
                <div
                  id={titleId}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`${titleId}-heading`}
                  aria-describedby={`${titleId}-description`}
                  className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-border/80 bg-sidebar/95 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
                >
                  <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                    <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border/80" />
                    <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
                      <div className="min-w-0">
                        <p
                          id={`${titleId}-heading`}
                          className="text-base font-semibold text-foreground"
                        >
                          {panelTitle}
                        </p>
                        <p
                          id={`${titleId}-description`}
                          className="mt-1 text-sm text-muted-foreground"
                        >
                          {panelDescription}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenPanel(null)}
                        className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-overlay-subtle hover:text-foreground"
                        aria-label="Đóng"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto py-4">
                      {openPanel === "goal" && monthlyGoal ? (
                        <MonthlyGoalForm
                          taskId={monthlyGoal.taskId}
                          yearMonth={monthlyGoal.yearMonth}
                          currentGoal={monthlyGoal.currentGoal}
                          unitLabel={monthlyGoal.unitLabel}
                        />
                      ) : null}
                      {openPanel === "reminder" && reminder ? (
                        <ReminderSettingsForm
                          defaultReminderTime={reminder.defaultReminderTime}
                          effectiveReminderTime={reminder.effectiveReminderTime}
                          initialEnabled={reminder.initialEnabled}
                          initialReminderTime={reminder.initialReminderTime}
                          isCappedBeforeDeadline={reminder.isCappedBeforeDeadline}
                          taskId={reminder.taskId}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
