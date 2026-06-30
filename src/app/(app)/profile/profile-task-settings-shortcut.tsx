"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, ChevronRight, Settings2, Target, X } from "lucide-react";

import { MonthlyGoalForm } from "@/app/(app)/tasks/[taskId]/monthly-goal-form";
import { ReminderSettingsForm } from "@/app/(app)/tasks/[taskId]/reminder-settings-form";
import type { ProfileTaskSetting } from "@/lib/tasks/profile-settings-service";

type Props = {
  settings: ProfileTaskSetting[];
};

export function ProfileTaskSettingsShortcut({ settings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(settings[0]?.taskId ?? "");
  const titleId = useId();

  const selectedSetting = useMemo(
    () =>
      settings.find((setting) => setting.taskId === selectedTaskId) ??
      settings[0] ??
      null,
    [selectedTaskId, settings],
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (settings.length === 0) {
    return null;
  }

  const canUseDOM = typeof document !== "undefined";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="group flex min-h-24 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-overlay-subtle p-4 text-left transition-colors hover:bg-overlay-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-overlay-medium text-primary ring-1 ring-border">
            <Settings2 className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              Nhắc nhở & mục tiêu
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Đặt giờ nhắc và mục tiêu tháng.
            </span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>

      {canUseDOM && isOpen
        ? createPortal(
            <div className="fixed inset-0 z-40 flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:px-6 sm:pb-6">
              <button
                type="button"
                aria-label="Đóng popup nhắc nhở và mục tiêu"
                className="absolute inset-0 bg-background/45 backdrop-blur-[6px]"
                onClick={() => setIsOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${titleId}-heading`}
                aria-describedby={`${titleId}-description`}
                className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[24px] border border-border/80 bg-sidebar/95 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
              >
                <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                  <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border/80 sm:hidden" />
                  <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
                    <div className="min-w-0">
                      <p
                        id={`${titleId}-heading`}
                        className="text-base font-semibold text-foreground"
                      >
                        Nhắc nhở & mục tiêu
                      </p>
                      <p
                        id={`${titleId}-description`}
                        className="mt-1 text-sm text-muted-foreground"
                      >
                        Chọn nhiệm vụ để cập nhật thiết lập cá nhân.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-overlay-subtle hover:text-foreground"
                      aria-label="Đóng"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>

                  <div className="grid max-h-[72vh] gap-4 overflow-y-auto py-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <div className="space-y-2">
                      {settings.map((setting) => {
                        const selected = setting.taskId === selectedSetting?.taskId;
                        return (
                          <button
                            key={setting.taskId}
                            type="button"
                            onClick={() => setSelectedTaskId(setting.taskId)}
                            className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                              selected
                                ? "border-primary/50 bg-primary/10"
                                : "border-border bg-overlay-subtle hover:bg-overlay-medium"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {setting.title}
                              </span>
                              <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                <Bell className="h-3.5 w-3.5" aria-hidden />
                                {setting.effectiveReminderTime
                                  ? setting.effectiveReminderTime
                                  : "Tắt nhắc"}
                                {setting.supportsMonthlyGoal && (
                                  <>
                                    <Target className="h-3.5 w-3.5" aria-hidden />
                                    {setting.currentGoal
                                      ? `${setting.currentGoal} ${setting.unitLabel}`
                                      : "Chưa đặt"}
                                  </>
                                )}
                              </span>
                            </span>
                            <ChevronRight
                              className={`h-4 w-4 shrink-0 ${
                                selected ? "text-primary" : "text-muted-foreground"
                              }`}
                              aria-hidden
                            />
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      {selectedSetting && (
                        <>
                          <ReminderSettingsForm
                            key={`reminder-${selectedSetting.taskId}`}
                            defaultReminderTime={selectedSetting.defaultReminderTime}
                            effectiveReminderTime={selectedSetting.effectiveReminderTime}
                            initialEnabled={selectedSetting.initialEnabled}
                            initialReminderTime={selectedSetting.initialReminderTime}
                            isCappedBeforeDeadline={
                              selectedSetting.isCappedBeforeDeadline
                            }
                            taskId={selectedSetting.taskId}
                          />
                          {selectedSetting.supportsMonthlyGoal && (
                            <MonthlyGoalForm
                              key={`goal-${selectedSetting.taskId}`}
                              taskId={selectedSetting.taskId}
                              yearMonth={selectedSetting.yearMonth}
                              currentGoal={selectedSetting.currentGoal}
                              unitLabel={selectedSetting.unitLabel}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
