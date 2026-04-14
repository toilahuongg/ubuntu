"use client";

import { useState } from "react";
import { Beaker, ChevronDown } from "lucide-react";

import { ROLE_LABELS, type SerializedUser } from "@/lib/domain";

export function DevLoginPanel({ users }: { users: SerializedUser[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Beaker className="h-3.5 w-3.5" />
            Dev login
          </span>
          <ChevronDown
            className={`h-4 w-4 text-amber-300 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="max-h-64 overflow-y-auto border-t border-amber-500/20 px-2 py-2">
            {users.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                Chưa có người dùng ACTIVE nào.
              </p>
            ) : (
              <form action="/api/auth/dev-login" method="POST">
                <ul className="space-y-1">
                  {users.map((user) => (
                    <li key={user.id}>
                      <button
                        type="submit"
                        name="userId"
                        value={user.id}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                      >
                        <span className="truncate font-medium">
                          {user.fullName}
                        </span>
                        <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wider text-amber-300/80">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
