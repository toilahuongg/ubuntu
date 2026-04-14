"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createTemplateAction } from "@/app/(app)/actions";

export function CreateTemplateForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createTemplateAction(formData);
      setIsOpen(false);
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
        <h3 className="text-sm font-semibold">Tạo mẫu nhiệm vụ</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="cursor-pointer rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
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

      <div className="grid grid-cols-2 gap-3">
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
            className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      <input type="hidden" name="isActive" value="true" />

      <button
        type="submit"
        disabled={isPending}
        className="btn-gradient flex h-11 w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Tạo mẫu
          </>
        )}
      </button>
    </form>
  );
}
