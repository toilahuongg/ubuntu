"use client";

import { useState, useTransition } from "react";
import { CheckCheck, CheckCircle2, Clock } from "lucide-react";
import type { SerializedUser } from "@/lib/domain";
import {
  approveUserAction,
  bulkApproveUsersAction,
  deleteUserAction,
} from "app/(app)/actions";
import { ConfirmDeleteButton, FormError } from "./_shared";

export function PendingUsers({ users }: { users: SerializedUser[] }) {
  const [isBulkPending, startBulkTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleBulkApprove() {
    if (users.length === 0) return;
    startBulkTransition(async () => {
      const result = await bulkApproveUsersAction(users.map((u) => u.id));
      if (!result.ok) setError(result.error);
      else setError(null);
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="mr-1 inline h-3.5 w-3.5" />
          Chờ duyệt ({users.length})
        </h2>
        {users.length > 1 && (
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={isBulkPending}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-lg bg-primary/15 px-3 py-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
          >
            {isBulkPending ? (
              <span
                aria-hidden
                className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
              />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Duyệt tất cả
          </button>
        )}
      </div>
      {error && (
        <div className="mb-3">
          <FormError message={error} onDismiss={() => setError(null)} />
        </div>
      )}
      <div className="glass-card divide-y divide-border overflow-hidden">
        {users.map((user) => (
          <PendingUserRow key={user.id} user={user} />
        ))}
      </div>
    </section>
  );
}

function PendingUserRow({ user }: { user: SerializedUser }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    startTransition(async () => {
      const result = await approveUserAction(user.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          {user.username && (
            <p className="text-[11px] text-muted-foreground">@{user.username}</p>
          )}
        </div>
        <div className="ml-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            className="flex min-h-11 cursor-pointer items-center gap-1 rounded-lg bg-overlay-medium px-4 py-2 text-xs font-medium transition-colors hover:bg-overlay-strong disabled:opacity-50"
          >
            {isPending ? (
              <div className="h-3 w-3 animate-spin rounded-full border border-foreground/30 border-t-foreground" />
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Duyệt
              </>
            )}
          </button>
          <ConfirmDeleteButton
            ariaLabel={`Từ chối ${user.fullName}`}
            onConfirm={() => deleteUserAction(user.id)}
          />
        </div>
      </div>
      {error && <FormError message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}
