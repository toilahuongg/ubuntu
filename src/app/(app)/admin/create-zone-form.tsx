"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createZoneAction } from "@/app/(app)/actions";

export function CreateZoneForm({
  teams,
}: {
  teams: { id: string; name: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createZoneAction(formData);
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
        Thêm địa vực
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="glass-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tạo địa vực mới</h3>
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
        placeholder="Tên địa vực"
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="code"
          required
          placeholder="Mã (VD: dv-01)"
          className="h-10 rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        <select name="teamId" required className="form-select">
          <option value="">Chọn nhóm</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="btn-gradient flex h-10 w-full items-center justify-center gap-1.5 text-sm disabled:opacity-50"
      >
        {isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
        ) : (
          "Tạo địa vực"
        )}
      </button>
    </form>
  );
}
