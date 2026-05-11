import { redirect } from "next/navigation";

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
  if (!session) redirect("/login");

  const canManage =
    canAccessManagement(session) ||
    canAccessZoneManagement(session) ||
    canAccessRegionManagement(session);

  if (!canManage) redirect("/dashboard");

  return (
    <div className="admin-shell mx-auto w-full max-w-md space-y-4 animate-slide-up">
      {children}
    </div>
  );
}
