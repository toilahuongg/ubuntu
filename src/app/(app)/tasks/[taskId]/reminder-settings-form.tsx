"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";

import { setTaskReminderPreferenceAction } from "./actions";

type ReminderSettingsFormProps = {
  defaultReminderTime: string;
  effectiveReminderTime: string | null;
  initialEnabled: boolean;
  initialReminderTime: string;
  isCappedBeforeDeadline: boolean;
  taskId: string;
};

export function ReminderSettingsForm({
  defaultReminderTime,
  effectiveReminderTime,
  initialEnabled,
  initialReminderTime,
  isCappedBeforeDeadline,
  taskId,
}: ReminderSettingsFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [reminderTime, setReminderTime] = useState(initialReminderTime);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await setTaskReminderPreferenceAction(formData);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  const statusText = enabled
    ? isCappedBeforeDeadline && effectiveReminderTime
      ? `Sẽ nhắc lúc ${effectiveReminderTime}, sớm hơn hạn 30 phút.`
      : `Sẽ nhắc lúc ${effectiveReminderTime ?? reminderTime}.`
    : "Đã tắt nhắc riêng cho nhiệm vụ này.";

  return (
    <form action={handleSubmit} className="glass-card space-y-3 p-4">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="enabled" value={enabled ? "true" : "false"} />
      {!enabled && (
        <input type="hidden" name="reminderTime" value={reminderTime} />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-overlay-medium">
            {enabled ? (
              <Bell className="h-4 w-4 text-primary" aria-hidden />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Nhắc nhiệm vụ</h2>
            <p className="text-xs text-muted-foreground">{statusText}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((value) => !value)}
          aria-pressed={enabled}
          className="flex h-9 shrink-0 cursor-pointer items-center rounded-lg border border-primary/30 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          {enabled ? "Đang bật" : "Đang tắt"}
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label
            htmlFor={`reminderTime-${taskId}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Giờ nhắc
          </label>
          <input
            id={`reminderTime-${taskId}`}
            name="reminderTime"
            type="time"
            required
            disabled={!enabled}
            value={reminderTime}
            onChange={(event) => setReminderTime(event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-overlay-subtle px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Mặc định của task: {defaultReminderTime}
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="mt-6 flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-background transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          Lưu
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
