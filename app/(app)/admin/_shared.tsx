"use client";

import { AlertCircle, Check, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import type { ActionResult } from "app/(app)/actions";

// Two-step inline confirm so destructive clicks can't fire accidentally on
// mobile where modal dialogs are disruptive. First click arms, second fires.
export function ConfirmDeleteButton({
  ariaLabel,
  confirmLabel = "Xác nhận xóa",
  onConfirm,
  size = "sm",
}: {
  ariaLabel: string;
  confirmLabel?: string;
  onConfirm: () => Promise<ActionResult>;
  size?: "sm" | "md";
}) {
  const [armed, setArmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btn = size === "sm" ? "p-1.5" : "h-9 px-3";

  function handleClick() {
    if (!armed) {
      setArmed(true);
      setError(null);
      // Auto-disarm after a few seconds so we don't leave a live red button.
      window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error);
      }
      setArmed(false);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={armed ? confirmLabel : ariaLabel}
        className={`${btn} inline-flex cursor-pointer items-center gap-1 rounded-lg text-xs transition-colors disabled:cursor-wait disabled:opacity-60 ${
          armed
            ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
            : "text-muted-foreground hover:bg-overlay-medium hover:text-destructive"
        }`}
      >
        {isPending ? (
          <span
            aria-hidden
            className={`${icon} animate-spin rounded-full border-2 border-current border-t-transparent`}
          />
        ) : armed ? (
          <>
            <Check className={icon} />
            <span className="text-[11px] font-medium">Xác nhận?</span>
          </>
        ) : (
          <Trash2 className={icon} />
        )}
      </button>
      {error && <FormError message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}

export function FormError({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng"
          className="shrink-0 cursor-pointer rounded p-0.5 hover:bg-destructive/20"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function FormSuccess({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] text-primary"
    >
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng"
          className="shrink-0 cursor-pointer rounded p-0.5 hover:bg-primary/20"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
