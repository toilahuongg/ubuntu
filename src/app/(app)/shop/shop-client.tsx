"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { Coins, Lock, Sparkles, Check } from "lucide-react";

import { CosmeticName } from "@/components/cosmetic-name";
import { LevelAvatar } from "@/components/level-avatar";
import {
  getCosmeticImageIcon,
  getCosmeticTextIcon,
} from "@/lib/cosmetics/icon";
import type {
  CosmeticView,
  EquippedView,
} from "@/lib/cosmetics/serialize";
import type { ShopItem } from "@/lib/services/cosmetics-service";
import type { CosmeticSlot } from "@/lib/models/cosmetic-types";

type Tab = "shop" | "inventory";

const DISPLAY_SLOTS = [
  "avatarFrame",
  "prefix",
  "suffix",
  "color",
  "effect",
] as const satisfies readonly CosmeticSlot[];

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  avatarFrame: "Khung avatar",
  prefix: "Biểu tượng trước",
  suffix: "Biểu tượng sau",
  color: "Màu sắc",
  effect: "Hiệu ứng",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Thường",
  rare: "Hiếm",
  epic: "Sử thi",
  legendary: "Huyền thoại",
};

const RARITY_BADGE: Record<string, string> = {
  common: "bg-overlay-subtle text-muted-foreground",
  rare: "bg-blue-500/20 text-blue-300",
  epic: "bg-purple-500/20 text-purple-300",
  legendary: "bg-amber-500/20 text-amber-300",
};

function itemToView(item: ShopItem): CosmeticView {
  return {
    id: item.id,
    code: item.code,
    slot: item.slot,
    name: item.name,
    rarity: item.rarity,
    icon: item.payload.icon,
    cssClass: item.payload.cssClass,
    gradient: item.payload.gradient,
  };
}

function previewEquippedFor(
  base: EquippedView | null,
  item: ShopItem,
): EquippedView {
  const preview: EquippedView = { ...(base ?? {}) };
  preview[item.slot] = itemToView(item);
  return preview;
}

export function ShopClient({
  fullName,
  initialItems,
  initialOwned,
  initialEquipped,
  initialPointBalance,
}: {
  fullName: string;
  initialItems: ShopItem[];
  initialOwned: CosmeticView[];
  initialEquipped: EquippedView;
  initialPointBalance: number;
}) {
  const [tab, setTab] = useState<Tab>("shop");
  const [items, setItems] = useState<ShopItem[]>(initialItems);
  const [ownedItems, setOwnedItems] = useState<CosmeticView[]>(initialOwned);
  const [equipped, setEquipped] = useState<EquippedView>(initialEquipped);
  const [balance, setBalance] = useState<number>(initialPointBalance);
  const [slotFilter, setSlotFilter] = useState<CosmeticSlot | "ALL">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const equippedIdSet = useMemo(() => {
    const ids = new Set<string>();
    for (const slot of DISPLAY_SLOTS) {
      const v = equipped[slot];
      if (v) ids.add(v.id);
    }
    return ids;
  }, [equipped]);

  const filtered = useMemo(() => {
    if (tab === "inventory") {
      const list: ShopItem[] = ownedItems.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: "",
        slot: c.slot,
        rarity: c.rarity,
        payload: { icon: c.icon, cssClass: c.cssClass, gradient: c.gradient },
        cost: null,
        unlockLevel: null,
        owned: true,
        canAfford: false,
        levelLocked: false,
        equipped: equippedIdSet.has(c.id),
      }));
      if (slotFilter === "ALL") return list;
      return list.filter((i) => i.slot === slotFilter);
    }
    if (slotFilter === "ALL") return items;
    return items.filter((i) => i.slot === slotFilter);
  }, [items, ownedItems, equippedIdSet, tab, slotFilter]);

  async function refresh() {
    const [shopRes, invRes] = await Promise.all([
      fetch("/api/cosmetics/shop", { cache: "no-store" }),
      fetch("/api/cosmetics/inventory", { cache: "no-store" }),
    ]);
    if (shopRes.ok) {
      const data = (await shopRes.json()) as { items: ShopItem[] };
      setItems(data.items);
    }
    if (invRes.ok) {
      const data = (await invRes.json()) as {
        pointBalance: number;
        equipped: Record<CosmeticSlot, CosmeticView | null>;
        owned: CosmeticView[];
      };
      setBalance(data.pointBalance);
      setEquipped(data.equipped);
      if (data.owned) setOwnedItems(data.owned);
    }
  }

  function handlePurchase(item: ShopItem) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/cosmetics/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cosmeticId: item.id }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? "Mua thất bại.");
        return;
      }
      await refresh();
    });
  }

  function handleEquip(slot: CosmeticSlot, cosmeticId: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/cosmetics/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, cosmeticId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? "Gắn thất bại.");
        return;
      }
      await refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Cửa hàng trang bị</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Trang bị cho tên của bạn — màu sắc, biểu tượng, hiệu ứng.
          </p>
        </div>
      <div className="flex items-center gap-1.5 rounded-full bg-overlay-medium px-3 py-1.5">
          <Coins className="h-4 w-4 text-amber-300" />
          <span className="text-sm font-bold tabular-nums">
            {balance.toLocaleString("vi-VN")}
          </span>
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          Xem trước tên của bạn
        </p>
        <div className="flex items-center gap-3">
          <LevelAvatar
            src="/badges/badge-6-male.png"
            alt="Avatar mẫu"
            equipped={equipped}
            size={56}
            className="h-14 w-14"
            imageClassName="rounded-full"
          />
          <p className="min-w-0 text-lg font-semibold">
            <CosmeticName fullName={fullName} equipped={equipped} />
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "shop"} onClick={() => setTab("shop")}>
          Cửa hàng
        </TabButton>
        <TabButton
          active={tab === "inventory"}
          onClick={() => setTab("inventory")}
        >
          Kho của tôi
        </TabButton>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={slotFilter === "ALL"}
          onClick={() => setSlotFilter("ALL")}
        >
          Tất cả
        </FilterChip>
        {DISPLAY_SLOTS.map((s) => (
          <FilterChip
            key={s}
            active={slotFilter === s}
            onClick={() => setSlotFilter(s)}
          >
            {SLOT_LABELS[s]}
          </FilterChip>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="glass-card space-y-3 py-8 text-center text-sm text-muted-foreground">
          <p>
            {tab === "inventory"
              ? "Bạn chưa sở hữu trang bị nào."
              : "Chưa có trang bị nào trong danh mục này."}
          </p>
          {slotFilter !== "ALL" ? (
            <button
              type="button"
              onClick={() => setSlotFilter("ALL")}
              className="mx-auto inline-flex h-9 items-center justify-center rounded-lg border border-border bg-overlay-subtle px-3 text-xs font-medium text-foreground transition-colors hover:bg-overlay-medium"
            >
              Xem tất cả danh mục
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              fullName={fullName}
              equipped={equipped}
              pending={pending}
              onPurchase={handlePurchase}
              onEquip={handleEquip}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-sky-500 text-white shadow-sm shadow-sky-500/25"
          : "bg-overlay-subtle text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-sky-300 bg-sky-50 text-sky-700"
          : "border-border bg-overlay-subtle text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ItemCard({
  item,
  fullName,
  equipped,
  pending,
  onPurchase,
  onEquip,
}: {
  item: ShopItem;
  fullName: string;
  equipped: EquippedView;
  pending: boolean;
  onPurchase: (item: ShopItem) => void;
  onEquip: (slot: CosmeticSlot, cosmeticId: string | null) => void;
}) {
  const previewEquipped = previewEquippedFor(equipped, item);

  return (
    <div className="glass-card space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CosmeticArtwork item={item} />
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-sm font-semibold">{item.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {SLOT_LABELS[item.slot]}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            RARITY_BADGE[item.rarity] ?? RARITY_BADGE.common
          }`}
        >
          {RARITY_LABELS[item.rarity] ?? item.rarity}
        </span>
      </div>

      {item.slot === "avatarFrame" ? (
        <div className="flex items-center justify-center py-2">
          <LevelAvatar
            src="/badges/badge-6-male.png"
            alt=""
            equipped={previewEquipped}
            size={72}
            className="h-18 w-18"
            imageClassName="rounded-full"
          />
        </div>
      ) : (
        <div className="rounded-xl bg-overlay-subtle px-3 py-3 text-center text-base font-semibold">
          <CosmeticName fullName={fullName} equipped={previewEquipped} />
        </div>
      )}

      {item.description ? (
        <p className="text-[11px] text-muted-foreground">{item.description}</p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        {item.cost !== null ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            <Coins className="h-3.5 w-3.5 text-amber-300" />
            {item.cost.toLocaleString("vi-VN")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Mở khóa đặc biệt
          </span>
        )}
        {item.unlockLevel ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Cấp {item.unlockLevel}
          </span>
        ) : null}
      </div>

      <div className="flex gap-2">
        {item.owned ? (
          item.equipped ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onEquip(item.slot, null)}
              className="flex-1 rounded-xl border border-border bg-overlay-subtle px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-overlay-medium disabled:opacity-50"
            >
              <Check className="mr-1 inline h-3.5 w-3.5" />
              Đang trang bị — Tháo
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => onEquip(item.slot, item.id)}
              className="btn-gradient flex-1 px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Trang bị
            </button>
          )
        ) : item.levelLocked ? (
          <button
            type="button"
            disabled
            className="flex-1 rounded-xl border border-border bg-overlay-subtle px-3 py-2 text-xs font-medium text-muted-foreground"
          >
            Cần cấp {item.unlockLevel}
          </button>
        ) : item.cost === null ? (
          <button
            type="button"
            disabled
            className="flex-1 rounded-xl border border-border bg-overlay-subtle px-3 py-2 text-xs font-medium text-muted-foreground"
          >
            Không bán
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || !item.canAfford}
            onClick={() => onPurchase(item)}
            className="btn-gradient flex-1 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {item.canAfford ? "Mua" : "Không đủ điểm"}
          </button>
        )}
      </div>
    </div>
  );
}

function CosmeticArtwork({ item }: { item: ShopItem }) {
  const imageIcon = getCosmeticImageIcon(item.payload.icon);
  const textIcon = getCosmeticTextIcon(item.payload.icon);

  if (item.slot === "avatarFrame" && imageIcon) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/60 shadow-sm shadow-sky-500/10 dark:border-white/10 dark:bg-white/5">
        <LevelAvatar
          src="/badges/badge-6-male.png"
          alt=""
          equipped={{ avatarFrame: itemToView(item) }}
          size={48}
          className="h-12 w-12"
          imageClassName="rounded-full"
        />
      </span>
    );
  }

  if (imageIcon) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/60 shadow-sm shadow-sky-500/10 dark:border-white/10 dark:bg-white/5">
        <Image
          src={imageIcon}
          alt=""
          aria-hidden
          width={56}
          height={56}
          className="h-12 w-12 object-contain"
        />
      </span>
    );
  }

  if (textIcon) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/60 text-3xl shadow-sm shadow-sky-500/10 dark:border-white/10 dark:bg-white/5">
        {textIcon}
      </span>
    );
  }

  const gradient =
    item.payload.gradient && item.payload.gradient.length > 1
      ? `linear-gradient(135deg, ${item.payload.gradient.join(", ")})`
      : undefined;

  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/60 shadow-sm shadow-sky-500/10 dark:border-white/10 dark:bg-white/5">
      <span
        className={`h-9 w-9 rounded-full ${
          gradient ? "" : "bg-gradient-to-br from-sky-300 via-cyan-300 to-emerald-300"
        }`}
        style={gradient ? { backgroundImage: gradient } : undefined}
        aria-hidden
      />
    </span>
  );
}
