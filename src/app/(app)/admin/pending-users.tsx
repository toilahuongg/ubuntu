"use client";

import { useTransition } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import type { SerializedUser } from "@/lib/domain";
import { approveUserAction } from "@/app/(app)/actions";

export function PendingUsers({ users }: { users: SerializedUser[] }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Clock className="mr-1 inline h-3.5 w-3.5" />
        Chờ duyệt ({users.length})
      </h2>
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

  function handleApprove() {
    startTransition(async () => {
      await approveUserAction(user.id);
    });
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.fullName}</p>
        {user.username && (
          <p className="text-[11px] text-muted-foreground">@{user.username}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleApprove}
        disabled={isPending}
        className="ml-3 flex cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/15 disabled:opacity-50"
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
    </div>
  );
}
