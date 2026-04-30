import { Outlet } from "react-router";
import { redirect } from "react-router";
import { getSessionUser } from "@/lib/auth/session";
import { refreshSessionUser } from "@/lib/services/auth-service";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { PushPermissionPopup } from "@/components/push-permission-popup";
import { getEquippedPayloadsForUsers } from "@/lib/services/cosmetics-service";
import { serializeEquipped } from "@/lib/cosmetics/serialize";
import { MEMBER_LIKE_ROLES, type Role } from "@/lib/domain";

export async function ServerComponent() {
  const session = await getSessionUser();

  if (!session) {
    throw redirect("/login");
  }

  if (session.status === "PENDING") {
    const fresh = await refreshSessionUser(session.id);
    if (!fresh) {
      throw redirect("/login");
    }
    if (fresh.status === "PENDING") {
      throw redirect("/onboarding");
    }
    throw redirect("/api/session/refresh?redirect=/dashboard");
  }

  if (session.status === "INACTIVE") {
    throw redirect("/login?error=Tài+khoản+đã+bị+khóa");
  }

  const underScoped =
    !session.teamId ||
    (session.role !== "TEAM_LEAD" && !session.zoneId) ||
    (((MEMBER_LIKE_ROLES as readonly Role[]).includes(session.role) ||
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
      throw redirect("/api/session/refresh?redirect=/dashboard");
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
        <Outlet />
      </main>
      <BottomNav role={session.role} />
      <PushPermissionPopup />
    </div>
  );
}
