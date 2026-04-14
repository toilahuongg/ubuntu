"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createZoneAction } from "@/app/(app)/actions";
import { FormError } from "./_shared";

export function CreateZoneForm({
  teams,
}: {
  teams: { id: string; name: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createZoneAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
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
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      {error && <FormError message={error} onDismiss={() => setError(null)} />}
      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="btn-gradient flex h-11 w-full items-center justify-center gap-1.5 text-sm disabled:cursor-wait disabled:opacity-60"
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
          "Tạo địa vực"
        )}
      </button>
    </form>
  );
}
