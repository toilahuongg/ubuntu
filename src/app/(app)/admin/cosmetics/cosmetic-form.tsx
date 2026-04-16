"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CosmeticName } from "@/components/cosmetic-name";
import type { CosmeticView, EquippedView } from "@/lib/cosmetics/serialize";
import type { CosmeticSlot } from "@/lib/models";

import {
  createCosmeticAction,
  updateCosmeticAction,
} from "./actions";

const SLOTS: { value: CosmeticSlot; label: string }[] = [
  { value: "prefix", label: "Trước (icon trước tên)" },
  { value: "suffix", label: "Sau (icon sau tên)" },
  { value: "color", label: "Màu sắc" },
  { value: "effect", label: "Hiệu ứng" },
];

const RARITIES = [
  { value: "common", label: "Thường" },
  { value: "rare", label: "Hiếm" },
  { value: "epic", label: "Sử thi" },
  { value: "legendary", label: "Huyền thoại" },
];

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-border bg-overlay-subtle px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25";

type Initial = {
  id: string;
  code: string;
  name: string;
  description: string;
  slot: CosmeticSlot;
  rarity: string;
  icon: string | null;
  cssClass: string | null;
  gradient: string[] | null;
  cost: number | null;
  unlockLevel: number | null;
  active: boolean;
};

export function CosmeticForm({ initial }: { initial: Initial | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Live preview state
  const [slot, setSlot] = useState<CosmeticSlot>(initial?.slot ?? "prefix");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [cssClass, setCssClass] = useState(initial?.cssClass ?? "");
  const [gradient, setGradient] = useState(
    initial?.gradient?.join(", ") ?? "",
  );

  const previewView: CosmeticView = {
    id: "preview",
    code: "preview",
    slot,
    name: "preview",
    rarity: initial?.rarity ?? "common",
    icon: icon.trim() || null,
    cssClass: cssClass.trim() || null,
    gradient: gradient
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  const previewEquipped: EquippedView = { [slot]: previewView };

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const action = initial ? updateCosmeticAction : createCosmeticAction;
      if (initial) formData.append("id", initial.id);
      const res = await action(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/admin/cosmetics");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Live preview */}
      <div className="glass-card p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          Xem trước
        </p>
        <p className="text-lg font-semibold">
          <CosmeticName fullName="Tên hiển thị" equipped={previewEquipped} />
        </p>
      </div>

      <div className="glass-card space-y-3 p-4">
        <Field label="Mã (code)" required>
          <input
            name="code"
            defaultValue={initial?.code ?? ""}
            required
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Tên hiển thị" required>
          <input
            name="name"
            defaultValue={initial?.name ?? ""}
            required
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Mô tả">
          <textarea
            name="description"
            defaultValue={initial?.description ?? ""}
            rows={2}
            className="w-full rounded-xl border border-border bg-overlay-subtle px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Slot">
            <select
              name="slot"
              value={slot}
              onChange={(e) => setSlot(e.target.value as CosmeticSlot)}
              className={INPUT_CLS}
            >
              {SLOTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Độ hiếm">
            <select
              name="rarity"
              defaultValue={initial?.rarity ?? "common"}
              className={INPUT_CLS}
            >
              {RARITIES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="glass-card space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Hình thức hiển thị
        </p>
        <Field label="Icon (emoji — dùng cho prefix/suffix)">
          <input
            name="icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className={INPUT_CLS}
            placeholder="👑 ⚔️ 🔥…"
          />
        </Field>
        <Field label="CSS class (whitelist trong globals.css)">
          <input
            name="cssClass"
            value={cssClass}
            onChange={(e) => setCssClass(e.target.value)}
            className={INPUT_CLS}
            placeholder="cn-glow, cn-gradient-gold, cn-shimmer…"
          />
        </Field>
        <Field label="Gradient (màu cách nhau bằng dấu phẩy)">
          <input
            name="gradient"
            value={gradient}
            onChange={(e) => setGradient(e.target.value)}
            className={INPUT_CLS}
            placeholder="#ffd700, #ff9a00"
          />
        </Field>
      </div>

      <div className="glass-card space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Mở khóa & giá
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Giá (điểm) — trống = không bán">
            <input
              name="cost"
              type="number"
              min={0}
              defaultValue={initial?.cost ?? ""}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Mốc cấp mở khóa">
            <input
              name="unlockLevel"
              type="number"
              min={1}
              defaultValue={initial?.unlockLevel ?? ""}
              className={INPUT_CLS}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial?.active ?? true}
          />
          Đang bán
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <Link
          href="/admin/cosmetics"
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium"
        >
          Hủy
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {pending ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Tạo mới"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
