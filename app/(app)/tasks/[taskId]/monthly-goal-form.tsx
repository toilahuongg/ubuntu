"use client";

import { useState, useTransition } from "react";
import { useRevalidator } from "react-router";
import { Target } from "lucide-react";

import { setMonthlyGoalAction } from "./actions";

export function MonthlyGoalForm({
  taskId,
  yearMonth,
  currentGoal,
  unitLabel = "lượt",
}: {
  taskId: string;
  yearMonth: string;
  currentGoal: number | null;
  unitLabel?: string;
}) {
  const { revalidate } = useRevalidator();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [value, setValue] = useState(currentGoal?.toString() ?? "");

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await setMonthlyGoalAction(formData);
      if (result.ok) {
        setSuccess(currentGoal ? "Đã cập nhật mục tiêu tháng." : "Đã đặt mục tiêu tháng.");
        revalidate();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="glass-card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">
          Mục tiêu tháng {yearMonth}
        </h3>
      </div>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="yearMonth" value={yearMonth} />
      <div className="flex items-center gap-2">
        <input
          name="targetCount"
          type="number"
          min={1}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Số ${unitLabel} muốn hoàn thành`}
          inputMode="numeric"
          className="h-10 flex-1 rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="btn-gradient h-10 min-w-24 rounded-xl px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : currentGoal ? "Cập nhật" : "Đặt"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {success && !error && <p className="text-xs text-primary">{success}</p>}
    </form>
  );
}
