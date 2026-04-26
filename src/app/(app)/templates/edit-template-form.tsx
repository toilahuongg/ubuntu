"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { updateTaskAction } from "./actions";
import { TaskScheduleFields } from "./task-schedule-fields";
import { getTaskTargetRolesForScope, ROLE_LABELS } from "@/lib/domain";
import { TASK_TYPE_LABELS } from "@/lib/tasks/constants";
import type { TaskSummary } from "@/lib/tasks/types";
import type { TaskScheduleType } from "@/lib/tasks/schedule";

export function EditTemplateForm({
  task,
  onClose,
}: {
  task: TaskSummary;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<TaskScheduleType>(
    task.scheduleType,
  );

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
  const targetRoleOptions = getTaskTargetRolesForScope(task.scope);

  return (
    <form action={handleSubmit} className="glass-card mt-2 space-y-4 p-4">
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="taskType" value={task.taskType} />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Sửa nhiệm vụ</h3>
          <p className="text-[11px] text-muted-foreground">
            Loại: {TASK_TYPE_LABELS[task.taskType]}
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

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Hiển thị cho vai trò *
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {targetRoleOptions.map((role) => (
            <label
              key={role}
              className="group flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-overlay-subtle px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-background has-[:checked]:shadow-[0_8px_22px_-14px_var(--primary)]"
            >
              <input
                type="checkbox"
                name="targetRoles"
                value={role}
                defaultChecked={task.targetRoles.includes(role)}
                className="sr-only"
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
      </div>

      <TaskScheduleFields
        taskType={task.taskType}
        scheduleType={scheduleType}
        onScheduleTypeChange={setScheduleType}
        defaultWeekdays={task.scheduledWeekdays}
        defaultMonthDays={task.scheduledMonthDays}
        idPrefix={`edit-task-${task.id}`}
      />

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

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <label
            htmlFor={`externalUrl-${task.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Link mở app/web ngoài
          </label>
          <input
            id={`externalUrl-${task.id}`}
            name="externalUrl"
            type="url"
            inputMode="url"
            defaultValue={task.externalUrl ?? ""}
            placeholder="https://example.com"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div>
          <label
            htmlFor={`externalLabel-${task.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Nhãn nút
          </label>
          <input
            id={`externalLabel-${task.id}`}
            name="externalLabel"
            maxLength={40}
            defaultValue={task.externalLabel ?? ""}
            placeholder="Mở liên kết"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
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
