"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";

import type { ActionResult } from "@/lib/actions/result";
import { FormError } from "./_shared";

export type TelegramBindingEntity = {
  id: string;
  name: string;
  telegramChatId: number | null;
  telegramChatTitle: string | null;
};

export type PendingGroupOption = {
  chatId: number;
  title: string;
};

type Props = {
  levelLabel: string;
  entity: TelegramBindingEntity;
  pendingGroups: PendingGroupOption[];
  bindAction: (id: string, chatId: number) => Promise<ActionResult>;
  unbindAction: (id: string) => Promise<ActionResult>;
};

export function TelegramBindingCard({
  levelLabel,
  entity,
  pendingGroups,
  bindAction,
  unbindAction,
}: Props) {
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onBind() {
    if (!selected) return;
    const chatId = Number.parseInt(selected, 10);
    if (!Number.isFinite(chatId)) return;
    setError(null);
    startTransition(async () => {
      const result = await bindAction(entity.id, chatId);
      if (!result.ok) setError(result.error);
      else setSelected("");
    });
  }

  function onUnbind() {
    setError(null);
    startTransition(async () => {
      const result = await unbindAction(entity.id);
      if (!result.ok) setError(result.error);
    });
  }

  const currentlyBound = entity.telegramChatId !== null;

  return (
    <div className="glass-card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">
          {levelLabel}: <span className="font-semibold">{entity.name}</span>
        </p>
      </div>

      {currentlyBound ? (
        <div className="rounded-lg border border-border bg-overlay-subtle px-3 py-2 text-xs">
          <p className="text-muted-foreground">Đang liên kết với:</p>
          <p className="font-medium">
            {entity.telegramChatTitle ?? "(không tên)"}
          </p>
          <p className="text-muted-foreground">ID: {entity.telegramChatId}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Chưa cấu hình nhóm Telegram.</p>
      )}

      {pendingGroups.length === 0 && !currentlyBound ? (
        <p className="text-[11px] text-muted-foreground">
          Hãy thêm bot vào nhóm Telegram — nhóm sẽ hiện tại đây để chọn.
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            disabled={isPending}
            className="h-10 flex-1 rounded-xl border border-border bg-overlay-subtle px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          >
            <option value="">— Chọn nhóm Telegram —</option>
            {pendingGroups.map((group) => (
              <option key={group.chatId} value={group.chatId}>
                {group.title} ({group.chatId})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onBind}
            disabled={!selected || isPending}
            className="btn-gradient h-10 rounded-xl px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {currentlyBound ? "Đổi nhóm" : "Liên kết"}
          </button>
        </div>
      )}

      {currentlyBound && (
        <button
          type="button"
          onClick={onUnbind}
          disabled={isPending}
          className="h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground disabled:cursor-wait disabled:opacity-60"
        >
          Hủy liên kết
        </button>
      )}

      {error && <FormError message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}
