import { Users } from "lucide-react";

import type { SessionUser } from "@/lib/domain";
import { ROLE_LABELS } from "@/lib/domain";
import { listVisibleUsersForActor } from "@/lib/services/organization-service";

export async function MembersRoster({ actor }: { actor: SessionUser }) {
  const users = await listVisibleUsersForActor(actor);
  if (users.length === 0) return null;

  return (
    <section id="members" className="scroll-mt-20">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Users className="h-4 w-4" />
        TĐ ({users.length})
      </h2>
      <div className="glass-card divide-y divide-border overflow-hidden">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium"
                title={user.fullName}
              >
                {user.fullName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
