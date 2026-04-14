"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createRegionAction } from "@/app/(app)/actions";

export function CreateRegionForm({
  zones,
}: {
  zones: { id: string; name: string; teamName?: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createRegionAction(formData);
      setIsOpen(false);
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Thêm khu vực
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="glass-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tạo khu vực mới</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="cursor-pointer rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <input
        name="name"
        required
        placeholder="Tên khu vực"
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="code"
          required
          placeholder="Mã (VD: kv-01)"
          className="h-10 rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        <select name="zoneId" required className="form-select">
          <option value="">Chọn địa vực</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
              {zone.teamName ? ` — ${zone.teamName}` : ""}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="btn-gradient flex h-10 w-full items-center justify-center gap-1.5 text-sm disabled:cursor-wait disabled:opacity-60"
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
          "Tạo khu vực"
        )}
      </button>
    </form>
  );
}
