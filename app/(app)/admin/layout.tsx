import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessManagement,
  canAccessRegionManagement,
  canAccessZoneManagement,
} from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");

  const canManage =
    canAccessManagement(session) ||
    canAccessZoneManagement(session) ||
    canAccessRegionManagement(session);

  if (!canManage) throw redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">{children}</div>
  );
}
