"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { updateTaskAction } from "./actions";
import type { TaskSummary } from "@/lib/tasks/types";

export function EditTemplateForm({
  task,
  onClose,
}: {
  task: TaskSummary;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateTaskAction(formData);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  const isCountTotal = task.taskType === "COUNT_TOTAL";

  return (
    <form action={handleSubmit} className="glass-card mt-2 space-y-4 p-4">
      <input type="hidden" name="taskId" value={task.id} />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Sửa nhiệm vụ</h3>
          <p className="text-[11px] text-muted-foreground">
            Loại:{" "}
            {isCountTotal ? "Tổng hợp theo số lần" : "Tổng hợp theo tháng"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isCountTotal && (
        <div>
          <label
            htmlFor={`targetCount-${task.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Mục tiêu tổng (số lần) *
          </label>
          <input
            id={`targetCount-${task.id}`}
            name="targetCount"
            type="number"
            min={1}
            required
            defaultValue={task.targetCount ?? undefined}
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      )}

      <div>
        <label
          htmlFor={`title-${task.id}`}
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Tiêu đề *
        </label>
        <input
          id={`title-${task.id}`}
          name="title"
          required
          defaultValue={task.title}
          className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div>
        <label
          htmlFor={`description-${task.id}`}
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Mô tả
        </label>
        <textarea
          id={`description-${task.id}`}
          name="description"
          rows={2}
          defaultValue={task.description ?? ""}
          className="w-full rounded-xl bg-overlay-subtle border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 resize-none"
        />
      </div>

      <div>
        <label
          htmlFor={`submissionMessage-${task.id}`}
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Lời thoại khi có người nộp (tuỳ chọn)
        </label>
        <textarea
          id={`submissionMessage-${task.id}`}
          name="submissionMessage"
          rows={2}
          maxLength={280}
          defaultValue={task.submissionMessage ?? ""}
          placeholder="VD: 🎯 {name} vừa chốt {task} lần thứ {count}!"
          className="w-full rounded-xl bg-overlay-subtle border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 resize-none"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Biến: {"{name}"}, {"{task}"}, {"{xp}"}, {"{count}"}. Để trống để dùng mẫu mặc định.
        </p>
      </div>

      {isCountTotal && (
        <div>
          <label
            htmlFor={`completionMessage-${task.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Lời thoại khi đạt mục tiêu (tuỳ chọn)
          </label>
          <textarea
            id={`completionMessage-${task.id}`}
            name="completionMessage"
            rows={2}
            maxLength={280}
            defaultValue={task.completionMessage ?? ""}
            placeholder="VD: 🔥 {task} đã đạt {target} lượt!"
            className="w-full rounded-xl bg-overlay-subtle border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 resize-none"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Biến: {"{task}"}, {"{target}"}. Để trống để dùng mẫu mặc định.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label
            htmlFor={`deadlineTime-${task.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Hạn chót *
          </label>
          <input
            id={`deadlineTime-${task.id}`}
            name="deadlineTime"
            type="time"
            required
            defaultValue={task.deadlineTime}
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div>
          <label
            htmlFor={`expReward-${task.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            XP thưởng
          </label>
          <input
            id={`expReward-${task.id}`}
            name="expReward"
            type="number"
            min={0}
            defaultValue={task.expReward}
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div>
          <label
            htmlFor={`pointReward-${task.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Điểm thưởng
          </label>
          <input
            id={`pointReward-${task.id}`}
            name="pointReward"
            type="number"
            min={0}
            defaultValue={task.pointReward}
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div>
          <label
            htmlFor={`lateWindowDays-${task.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Nhập bù (ngày)
          </label>
          <input
            id={`lateWindowDays-${task.id}`}
            name="lateWindowDays"
            type="number"
            min={1}
            max={365}
            defaultValue={task.lateWindowDays}
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="btn-gradient flex h-11 w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background"
            />
            Đang lưu…
          </>
        ) : (
          <>
            <Check className="h-4 w-4" aria-hidden />
            Lưu thay đổi
          </>
        )}
      </button>
    </form>
  );
}
