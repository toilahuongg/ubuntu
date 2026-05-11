"use client";

import { useMemo, useState, useTransition } from "react";
import { UserPlus, Check } from "lucide-react";

import { grantCosmeticAction } from "./actions";

type UserRow = { id: string; fullName: string };

export function GrantCosmeticPanel({
  cosmeticId,
  cosmeticName,
  users,
}: {
  cosmeticId: string;
  cosmeticName: string;
  users: UserRow[];
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [grantedIds, setGrantedIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 30);
    return users
      .filter((u) => u.fullName.toLowerCase().includes(q))
      .slice(0, 30);
  }, [query, users]);

  function grant(userId: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("userId", userId);
      fd.append("cosmeticId", cosmeticId);
      const res = await grantCosmeticAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGrantedIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    });
  }

  return (
    <section id="grant" className="mt-6 space-y-3">
      <h2 className="font-display text-sm font-semibold text-foreground">
        Cấp &ldquo;{cosmeticName}&rdquo; cho người dùng
      </h2>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="glass-card space-y-2 p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tên người dùng…"
          className="h-10 w-full rounded-xl border border-border bg-overlay-subtle px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Không tìm thấy người dùng.
            </p>
          ) : (
            filtered.map((u) => {
              const granted = grantedIds.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={pending || granted}
                  onClick={() => grant(u.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-overlay-subtle disabled:opacity-50"
                >
                  <span>{u.fullName}</span>
                  {granted ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                      <Check className="h-3.5 w-3.5" /> Đã cấp
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <UserPlus className="h-3.5 w-3.5" /> Cấp
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
