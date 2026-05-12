"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";

import { deleteRegionAction, updateRegionAction } from "@/app/(app)/actions";
import { ConfirmDeleteButton, FormError } from "./_shared";

type RegionDetail = {
  code: string;
  id: string;
  memberCount: number;
  name: string;
  teamName?: string;
  zoneId: string;
  zoneName?: string;
};

export function RegionDetailActions({ region }: { region: RegionDetail }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateRegionAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  async function handleDelete() {
    const result = await deleteRegionAction(region.id);
    if (result.ok) {
      router.replace(`/admin/regions?zoneId=${encodeURIComponent(region.zoneId)}`);
      router.refresh();
    }
    return result;
  }

  if (isEditing) {
    return (
      <form action={handleSubmit} className="glass-card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Sửa khu vực</h2>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsEditing(false);
            }}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <input type="hidden" name="id" value={region.id} />
        <input
          name="name"
          required
          defaultValue={region.name}
          placeholder="Tên khu vực"
          className="h-10 w-full rounded-lg border border-border/60 bg-card px-3 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
        <input
          name="code"
          required
          defaultValue={region.code}
          placeholder="Mã"
          className="h-10 w-full rounded-lg border border-border/60 bg-card px-3 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
        {(region.zoneName || region.teamName) && (
          <p className="text-[11px] text-muted-foreground">
            Thuộc: {region.zoneName}
            {region.teamName && ` · ${region.teamName}`} (không đổi được)
          </p>
        )}
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
              Đang lưu…
            </>
          ) : (
            "Lưu thay đổi"
          )}
        </button>
      </form>
    );
  }

  return (
    <section className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{region.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {region.code}
            {region.zoneName && ` · ${region.zoneName}`}
            {region.teamName && ` · ${region.teamName}`}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {region.memberCount} thành viên trong khu vực
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
            aria-label="Sửa khu vực"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <ConfirmDeleteButton
            ariaLabel={`Xóa khu vực ${region.name}`}
            onConfirm={handleDelete}
            size="md"
          />
        </div>
      </div>
    </section>
  );
}
