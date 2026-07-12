"use client";

import { useState, useTransition } from "react";
import { KeyRound, X } from "lucide-react";

import { changePasswordAction } from "@/app/(app)/profile/actions";
import { FormSuccess } from "@/app/(app)/admin/_shared";

type Props = {
  compact?: boolean;
};

export function ChangePasswordForm({ compact = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (result.ok) {
        setSuccess("Đã đổi mật khẩu thành công.");
        setIsOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (!isOpen) {
    return (
      <div className="space-y-2">
        {success && (
          <FormSuccess message={success} onDismiss={() => setSuccess(null)} />
        )}
        <button
          type="button"
          onClick={() => {
            setSuccess(null);
            setIsOpen(true);
          }}
          className={`flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-overlay-medium ${
            compact ? "bg-overlay-subtle" : ""
          }`}
        >
          <KeyRound className="h-4 w-4" />
          Đổi mật khẩu
        </button>
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className={`space-y-4 p-4 ${
        compact
          ? "rounded-xl border border-border bg-overlay-subtle"
          : "glass-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Đổi mật khẩu</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Đóng biểu mẫu đổi mật khẩu"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="cp-current"
          className="text-xs font-medium text-muted-foreground"
        >
          Mật khẩu hiện tại
        </label>
        <input
          id="cp-current"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "cp-error" : undefined}
          className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="cp-new"
          className="text-xs font-medium text-muted-foreground"
        >
          Mật khẩu mới
        </label>
        <input
          id="cp-new"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="cp-confirm"
          className="text-xs font-medium text-muted-foreground"
        >
          Xác nhận mật khẩu mới
        </label>
        <input
          id="cp-confirm"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      {error && (
        <p id="cp-error" className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

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
            Đang đổi…
          </>
        ) : (
          "Đổi mật khẩu"
        )}
      </button>
    </form>
  );
}
