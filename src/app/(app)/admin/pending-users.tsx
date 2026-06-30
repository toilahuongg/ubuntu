"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import type { SerializedUser } from "@/lib/domain";
import {
  approveUserWithRegionAction,
  deleteUserAction,
} from "@/app/(app)/actions";
import { ConfirmDeleteButton, FormError } from "./_shared";

type RegionOption = {
  id: string;
  name: string;
  teamId: string;
  zoneId: string;
  zoneName?: string;
};

export function PendingUsers({
  regions,
  users,
}: {
  regions: RegionOption[];
  users: SerializedUser[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          <Clock className="mr-1 inline h-3.5 w-3.5" />
          Chờ duyệt ({users.length})
        </h2>
      </div>
      <div className="glass-card divide-y divide-border overflow-hidden">
        {users.map((user) => (
          <PendingUserRow key={user.id} regions={regions} user={user} />
        ))}
      </div>
    </section>
  );
}

function PendingUserRow({
  regions,
  user,
}: {
  regions: RegionOption[];
  user: SerializedUser;
}) {
  const [isPending, startTransition] = useTransition();
  const [regionId, setRegionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const regionOptions = regions.filter((region) => {
    if (user.zoneId) return region.zoneId === user.zoneId;
    if (user.teamId) return region.teamId === user.teamId;
    return true;
  });

  function handleApprove(formData: FormData) {
    startTransition(async () => {
      const result = await approveUserWithRegionAction(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form action={handleApprove} className="flex flex-col gap-2 px-4 py-3">
      <input name="userId" type="hidden" value={user.id} />
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          {user.username && (
            <p className="text-[11px] text-muted-foreground">@{user.username}</p>
          )}
        </div>
        <div className="ml-3 flex items-center gap-2">
          <select
            name="regionId"
            value={regionId}
            onChange={(event) => setRegionId(event.target.value)}
            required
            className="form-select h-11 min-w-32 text-xs"
            aria-label={`Chọn Khu vực cho ${user.fullName}`}
          >
            <option value="">Chọn KV</option>
            {regionOptions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
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
    </form>
  );
}
