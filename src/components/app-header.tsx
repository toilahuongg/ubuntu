import { Shield } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { ROLE_LABELS } from "@/lib/domain";

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-white/10 bg-background/50 px-4 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/25"
      style={{ height: "var(--header-height)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-transparent"
      />
      <div className="relative mx-auto flex h-full max-w-2xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{user.fullName}</p>
            <p className="text-[11px] text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
