import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { refreshSessionUser } from "@/lib/services/auth-service";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { getEquippedPayloadsForUsers } from "@/lib/services/cosmetics-service";
import { serializeEquipped } from "@/lib/cosmetics/serialize";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  if (session.status === "PENDING") {
    const fresh = await refreshSessionUser(session.id);
    if (!fresh) {
      redirect("/login");
    }
    if (fresh.status === "PENDING") {
      redirect("/onboarding");
    }
    redirect("/api/session/refresh?next=/dashboard");
  }

  if (session.status === "INACTIVE") {
    redirect("/login?error=Tài+khoản+đã+bị+khóa");
  }

  // Session JWT is signed at login and not auto-updated when an admin edits
  // the user afterwards. When the session is missing a scope but the DB has
  // newer assignments, re-sign the cookie so dashboard scope filters work.
  // Only probes the DB when the session looks under-scoped for its role to
  // avoid an extra query on every request.
  const underScoped =
    !session.teamId ||
    (session.role !== "TEAM_LEAD" && !session.zoneId) ||
    ((session.role === "MEMBER" ||
      session.role === "NGV" ||
      session.role === "REGIONAL_LEAD") &&
      !session.regionId);
  if (underScoped) {
    const fresh = await refreshSessionUser(session.id);
    if (
      fresh &&
      (fresh.teamId !== session.teamId ||
        fresh.zoneId !== session.zoneId ||
        fresh.regionId !== session.regionId ||
        fresh.role !== session.role)
    ) {
      redirect("/api/session/refresh?next=/dashboard");
    }
  }

  const equippedMap = await getEquippedPayloadsForUsers([session.id]);
  const rawEquipped = equippedMap.get(session.id);
  const equippedView = rawEquipped ? serializeEquipped(rawEquipped) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Bỏ qua đến nội dung chính
      </a>
      <AppHeader user={session} equipped={equippedView} />
      <main
        id="main-content"
        className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8"
      >
        {children}
      </main>
      <BottomNav role={session.role} />
    </div>
  );
}
