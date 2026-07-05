"use client";

import { VersionedImage as Image } from "@/components/VersionedImage";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Plus, UserPlus } from "lucide-react";

import { CosmeticName } from "@/components/cosmetic-name";
import { LevelAvatar } from "@/components/level-avatar";
import {
  getCosmeticImageIcon,
  getCosmeticTextIcon,
} from "@/lib/cosmetics/icon";
import type { CosmeticView, EquippedView } from "@/lib/cosmetics/serialize";
import type { CosmeticSlot } from "@/lib/models/cosmetic-types";

import { toggleCosmeticActiveAction } from "./actions";

type CosmeticRow = CosmeticView & {
  description: string;
  cost: number | null;
  unlockLevel: number | null;
  active: boolean;
};

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  prefix: "Trước",
  suffix: "Sau",
  color: "Màu",
  effect: "Hiệu ứng",
  avatarFrame: "Khung avatar",
};

export function CosmeticsManager({
  cosmetics,
  canEdit,
}: {
  cosmetics: CosmeticRow[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleActive(row: CosmeticRow) {
    setError(null);
    startTransition(async () => {
      const res = await toggleCosmeticActiveAction(row.id, !row.active);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {canEdit && (
        <Link
          href="/admin/cosmetics/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Thêm trang bị mới
        </Link>
      )}

      <div className="space-y-2">
        {cosmetics.length === 0 ? (
          <p className="glass-card py-10 text-center text-sm text-muted-foreground">
            Chưa có trang bị nào.
          </p>
        ) : (
          cosmetics.map((row) => (
            <div key={row.id} className="glass-card space-y-2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <CosmeticArtwork row={row} />
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-mono">{row.code}</span>
                      {" · "}
                      {SLOT_LABELS[row.slot]} · {row.rarity}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canEdit && (
                    <Link
                      href={`/admin/cosmetics/${row.id}#grant`}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-overlay-subtle hover:text-foreground"
                      aria-label="Cấp cho người dùng"
                      title="Cấp cho người dùng"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Link>
                  )}
                  {canEdit && (
                    <Link
                      href={`/admin/cosmetics/${row.id}`}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-overlay-subtle hover:text-foreground"
                      aria-label="Sửa"
                      title="Sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>

              {row.slot === "avatarFrame" ? (
                <div className="flex items-center justify-center py-1">
                  <LevelAvatar
                    src="/badges/badge-6-male.png"
                    alt=""
                    equipped={{ avatarFrame: row }}
                    size={48}
                    className="h-12 w-12"
                    imageClassName="rounded-full"
                  />
                </div>
              ) : (
                <div className="rounded-lg bg-overlay-subtle px-3 py-2 text-sm">
                  <CosmeticName
                    fullName="Tên hiển thị"
                    equipped={{ [row.slot]: row } as EquippedView}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>
                  {row.cost !== null
                    ? `${row.cost.toLocaleString("vi-VN")} điểm`
                    : "Không bán"}
                  {row.unlockLevel ? ` · Cấp ${row.unlockLevel}` : ""}
                </span>
                {canEdit && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={() => toggleActive(row)}
                      disabled={pending}
                    />
                    <span>{row.active ? "Đang bán" : "Tạm ngưng"}</span>
                  </label>
                )}
                {!canEdit && (
                  <span className="text-[11px] text-muted-foreground">
                    {row.active ? "Đang bán" : "Tạm ngưng"}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CosmeticArtwork({ row }: { row: CosmeticRow }) {
  const imageIcon = getCosmeticImageIcon(row.icon);
  const textIcon = getCosmeticTextIcon(row.icon);

  if (row.slot === "avatarFrame" && imageIcon) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-overlay-subtle">
        <LevelAvatar
          src="/badges/badge-6-male.png"
          alt=""
          equipped={{ avatarFrame: row }}
          size={36}
          className="h-9 w-9"
          imageClassName="rounded-full"
        />
      </span>
    );
  }

  if (imageIcon) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-overlay-subtle">
        <Image
          src={imageIcon}
          alt=""
          aria-hidden
          width={44}
          height={44}
          className="h-9 w-9 object-contain"
        />
      </span>
    );
  }

  if (textIcon) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-overlay-subtle text-2xl">
        {textIcon}
      </span>
    );
  }

  const gradient =
    row.gradient && row.gradient.length > 1
      ? `linear-gradient(135deg, ${row.gradient.join(", ")})`
      : undefined;

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-overlay-subtle">
      <span
        className={`h-7 w-7 rounded-full ${
          gradient ? "" : "bg-gradient-to-br from-sky-300 via-cyan-300 to-emerald-300"
        }`}
        style={gradient ? { backgroundImage: gradient } : undefined}
        aria-hidden
      />
    </span>
  );
}
