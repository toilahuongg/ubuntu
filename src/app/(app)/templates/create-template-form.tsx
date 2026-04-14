"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { createTaskAction } from "./actions";

export function CreateTemplateForm({ scopeLabel }: { scopeLabel: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
            Phạm vi: {scopeLabel}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
