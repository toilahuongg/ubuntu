"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { createTaskAction } from "./actions";
import { TaskScheduleFields } from "./task-schedule-fields";
import {
  getTaskTargetRolesForScope,
  ROLE_LABELS,
  SCOPE_LABELS,
  type TaskScope,
} from "@/lib/domain";
import type { TaskType } from "@/lib/tasks/constants";
import {
  DEFAULT_TASK_SCHEDULE_TYPE,
  type TaskScheduleType,
} from "@/lib/tasks/schedule";

const TASK_TYPE_OPTIONS: Array<{
  value: TaskType;
  label: string;
  description: string;
}> = [
  {
    value: "MONTHLY_PER_MEMBER",
    label: "Theo tháng",
    description: "Đặt mục tiêu tháng, mỗi ngày có thể ghi nhiều lượt.",
  },
  {
    value: "WEEKLY_PER_MEMBER",
    label: "Theo tuần",
    description: "Đặt mục tiêu tháng, gom theo nhóm nhiệm vụ tuần, mỗi ngày ghi nhiều lượt.",
  },
  {
    value: "DAILY_PER_MEMBER",
    label: "Theo ngày",
    description: "Đặt mục tiêu tháng, mỗi ngày chỉ tính một lượt hoàn thành.",
  },
  {
    value: "COUNT_TOTAL",
    label: "Theo số lần",
    description: "Cộng tổng số lần của tất cả thành viên; đạt mục tiêu thì task đóng.",
  },
];

export function CreateTemplateForm({ scope }: { scope: TaskScope }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<TaskType>("MONTHLY_PER_MEMBER");
  const [scheduleType, setScheduleType] = useState<TaskScheduleType>(
    DEFAULT_TASK_SCHEDULE_TYPE,
  );
  const targetRoleOptions = getTaskTargetRolesForScope(scope);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTaskAction(formData);
      if (result.ok) {
        setIsOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-secondary-gradient flex h-11 w-full items-center justify-center gap-2 text-sm"
      >
        <Plus className="h-4 w-4" />
        Tạo mẫu mới
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="glass-card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Tạo mẫu nhiệm vụ</h3>
          <p className="text-[11px] text-muted-foreground">
            Phạm vi: {SCOPE_LABELS[scope]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Loại nhiệm vụ *
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          {TASK_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTaskType(option.value)}
              className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                taskType === option.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-overlay-subtle text-muted-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="taskType" value={taskType} />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {TASK_TYPE_OPTIONS.find((option) => option.value === taskType)
            ?.description}
        </p>
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
                defaultChecked
                className="sr-only"
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
      </div>

      <TaskScheduleFields
        taskType={taskType}
        scheduleType={scheduleType}
        onScheduleTypeChange={setScheduleType}
        idPrefix="create-task"
      />

      {taskType === "COUNT_TOTAL" && (
        <div>
          <label
            htmlFor="targetCount"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Mục tiêu tổng (số lần) *
          </label>
          <input
            id="targetCount"
            name="targetCount"
            type="number"
            min={1}
            required
            placeholder="VD: 100"
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      )}

      {taskType === "WEEKLY_PER_MEMBER" && (
        <div>
          <label
            htmlFor="maxPerWeek"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Giới hạn mỗi tuần (tùy chọn)
          </label>
          <input
            id="maxPerWeek"
            name="maxPerWeek"
            type="number"
            min={1}
            placeholder="Để trống = không giới hạn"
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Có số thì nhiệm vụ dùng giới hạn tuần admin set. Để trống thì thành viên tự đặt mục tiêu tháng.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="title" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Tiêu đề *
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="VD: Cập nhật doanh số"
          className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Mô tả
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Mô tả chi tiết (tùy chọn)"
          className="w-full rounded-xl bg-overlay-subtle border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 resize-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <label htmlFor="externalUrl" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Link mở app/web ngoài
          </label>
          <input
            id="externalUrl"
            name="externalUrl"
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div>
          <label htmlFor="externalLabel" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Nhãn nút
          </label>
          <input
            id="externalLabel"
            name="externalLabel"
            maxLength={40}
            placeholder="Mở liên kết"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      <div>
        <label htmlFor="submissionMessage" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Lời thoại khi có người nộp (tuỳ chọn)
        </label>
        <textarea
          id="submissionMessage"
          name="submissionMessage"
          rows={2}
          maxLength={280}
          placeholder="VD: 🎯 {name} vừa chốt {task} lần thứ {count}!"
          className="w-full rounded-xl bg-overlay-subtle border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 resize-none"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Biến: {"{name}"}, {"{task}"}, {"{xp}"}, {"{count}"}. Để trống để dùng mẫu mặc định.
        </p>
      </div>

      {taskType === "COUNT_TOTAL" && (
        <div>
          <label htmlFor="completionMessage" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Lời thoại khi đạt mục tiêu (tuỳ chọn)
          </label>
          <textarea
            id="completionMessage"
            name="completionMessage"
            rows={2}
            maxLength={280}
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
          <label htmlFor="deadlineTime" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Hạn chót *
          </label>
          <input
            id="deadlineTime"
            name="deadlineTime"
            type="time"
            required
            defaultValue="21:00"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div>
          <label htmlFor="expReward" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            XP thưởng
          </label>
          <input
            id="expReward"
            name="expReward"
            type="number"
            min={0}
            defaultValue={10}
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div>
          <label htmlFor="pointReward" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Điểm thưởng
          </label>
          <input
            id="pointReward"
            name="pointReward"
            type="number"
            min={0}
            defaultValue={10}
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div>
          <label htmlFor="lateWindowDays" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Nhập bù (ngày)
          </label>
          <input
            id="lateWindowDays"
            name="lateWindowDays"
            type="number"
            min={1}
            max={365}
            defaultValue={7}
            inputMode="numeric"
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {/* isDtt checkbox removed — DTT task assignments are now managed per-class */}

      <input type="hidden" name="isActive" value="true" />

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
            Đang tạo…
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" aria-hidden />
            Tạo mẫu
          </>
        )}
      </button>
    </form>
  );
}
