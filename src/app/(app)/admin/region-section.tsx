"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronRight, MapPin, Pencil, Users, X } from "lucide-react";

import { deleteRegionAction, updateRegionAction } from "@/app/(app)/actions";
import { ConfirmDeleteButton, FormError } from "./_shared";

type Region = {
  code: string;
  id: string;
  leadUserIds: string[];
  memberCount: number;
  name: string;
  teamId: string;
  teamName?: string;
  zoneId: string;
  zoneName?: string;
};

export function RegionSection({ regions }: { regions: Region[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (regions.length === 0) {
    return (
      <div className="glass-card py-8 text-center text-sm text-muted-foreground">
        Chưa có khu vực nào.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {regions.map((region) =>
        editingId === region.id ? (
          <EditRegionRow
            key={region.id}
            region={region}
            onClose={() => setEditingId(null)}
          />
        ) : (
          <div
            key={region.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <Link
              href={`/admin/regions/${encodeURIComponent(region.id)}`}
              className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg pr-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              aria-label={`Xem tiến độ thành viên khu vực ${region.name}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="truncate text-sm font-medium">{region.name}</p>
                </div>
                <p className="ml-5.5 text-[11px] text-muted-foreground">
                  {region.code}
                  {region.zoneName && ` · ${region.zoneName}`}
                  {region.teamName && ` · ${region.teamName}`}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {region.memberCount}
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setEditingId(region.id)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-overlay-medium hover:text-foreground"
                aria-label="Sửa"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <ConfirmDeleteButton
                ariaLabel={`Xóa khu vực ${region.name}`}
                onConfirm={() => deleteRegionAction(region.id)}
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function EditRegionRow({
  region,
  onClose,
}: {
  region: Region;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateRegionAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">
          Sửa khu vực
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
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
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
      <input
        name="code"
        required
        defaultValue={region.code}
        placeholder="Mã"
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
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
