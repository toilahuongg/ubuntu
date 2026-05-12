import Image from "next/image";
import type { SessionUser } from "@/lib/domain";
import { ROLE_LABELS } from "@/lib/domain";
import { CosmeticName } from "@/components/cosmetic-name";
import type { EquippedView } from "@/lib/cosmetics/serialize";

export function AppHeader({
  user,
  equipped,
}: {
  user: SessionUser;
  equipped?: EquippedView | null;
}) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-40 border-b border-border bg-sidebar/80 px-4 shadow-[0_1px_0_0_var(--overlay-subtle)_inset,0_8px_24px_-12px_var(--overlay-strong)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-sidebar/60 sm:px-6 lg:px-8"
      style={{ height: "var(--header-height)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-overlay-subtle via-transparent to-transparent"
      />
      <div className="relative mx-auto flex h-full max-w-2xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center">
            <Image
              src="/icons/logo.png"
              alt="Ubuntu"
              width={32}
              height={32}
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">
              <CosmeticName fullName={user.fullName} equipped={equipped} />
            </p>
            <p className="text-[11px] text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
