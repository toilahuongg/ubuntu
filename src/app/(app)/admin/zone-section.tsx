"use client";

import { useState, useTransition } from "react";
import { Layers, MapPin, Pencil, Users, X } from "lucide-react";

import { updateZoneAction } from "@/app/(app)/actions";

type Zone = {
  code: string;
  id: string;
  leadUserIds: string[];
  memberCount: number;
  name: string;
  regionCount: number;
  teamId: string;
  teamName?: string;
};

export function ZoneSection({ zones }: { zones: Zone[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (zones.length === 0) {
    return (
      <div className="glass-card py-8 text-center text-sm text-muted-foreground">
        Chưa có địa vực nào.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {zones.map((zone) =>
        editingId === zone.id ? (
          <EditZoneRow
            key={zone.id}
            zone={zone}
            onClose={() => setEditingId(null)}
          />
        ) : (
          <div
            key={zone.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="truncate text-sm font-medium">{zone.name}</p>
              </div>
              <p className="ml-5.5 text-[11px] text-muted-foreground">
                {zone.code}
                {zone.teamName && ` · ${zone.teamName}`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {zone.regionCount}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {zone.memberCount}
              </span>
              <button
                type="button"
                onClick={() => setEditingId(zone.id)}
                className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label="Sửa"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function EditZoneRow({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateZoneAction(formData);
      onClose();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sửa địa vực
        </p>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <input type="hidden" name="id" value={zone.id} />
      <input
        name="name"
        required
        defaultValue={zone.name}
        placeholder="Tên địa vực"
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
      <input
        name="code"
        required
        defaultValue={zone.code}
        placeholder="Mã"
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
      {zone.teamName && (
        <p className="text-[11px] text-muted-foreground">
          Thuộc nhóm: {zone.teamName} (không đổi được)
        </p>
      )}
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
            Đang lưu…
          </>
        ) : (
          "Lưu thay đổi"
        )}
      </button>
    </form>
  );
}
