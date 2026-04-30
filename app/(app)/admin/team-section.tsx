"use client";

import { useState, useTransition } from "react";
import { Building2, Pencil, Users, X } from "lucide-react";

import { deleteTeamAction, updateTeamAction } from "app/(app)/actions";
import { ConfirmDeleteButton, FormError } from "./_shared";

type Team = {
  code: string;
  id: string;
  leadUserIds: string[];
  memberCount: number;
  name: string;
};

export function TeamSection({ teams }: { teams: Team[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (teams.length === 0) {
    return (
      <div className="glass-card py-8 text-center text-sm text-muted-foreground">
        Chưa có nhóm nào.
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {teams.map((team) =>
        editingId === team.id ? (
          <EditTeamRow
            key={team.id}
            team={team}
            onClose={() => setEditingId(null)}
          />
        ) : (
          <div
            key={team.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="truncate text-sm font-medium">{team.name}</p>
              </div>
              <p className="ml-5.5 text-[11px] text-muted-foreground">
                {team.code}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {team.memberCount}
              </span>
              <button
                type="button"
                onClick={() => setEditingId(team.id)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-overlay-medium hover:text-foreground"
                aria-label="Sửa"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <ConfirmDeleteButton
                ariaLabel={`Xóa nhóm ${team.name}`}
                onConfirm={() => deleteTeamAction(team.id)}
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function EditTeamRow({ team, onClose }: { team: Team; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateTeamAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sửa nhóm
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-medium hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <input type="hidden" name="id" value={team.id} />
      <input
        name="name"
        required
        defaultValue={team.name}
        placeholder="Tên nhóm"
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
      <input
        name="code"
        required
        defaultValue={team.code}
        placeholder="Mã"
        className="h-10 w-full rounded-xl bg-overlay-subtle border border-border px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
      {error && <FormError message={error} onDismiss={() => setError(null)} />}
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
            Đang lưu…
          </>
        ) : (
          "Lưu thay đổi"
        )}
      </button>
    </form>
  );
}
