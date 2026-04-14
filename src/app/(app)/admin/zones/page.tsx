import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessManagement } from "@/lib/permissions";
import { getAdminSnapshot } from "@/lib/services/organization-service";

import { CreateZoneForm } from "../create-zone-form";
import { AdminSubHeader } from "../sub-header";
import { ZoneSection } from "../zone-section";

export default async function AdminZonesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessManagement(session)) redirect("/admin");

  const snapshot = await getAdminSnapshot(session);
  const teamOptions = snapshot.teams.map((t) => ({ id: t.id, name: t.name }));

  return (
    <>
      <AdminSubHeader
        title={`Địa vực (${snapshot.zones.length})`}
        description="Quản lý các địa vực theo nhóm"
      />
      <div className="space-y-3">
        <ZoneSection zones={snapshot.zones} />
        <CreateZoneForm teams={teamOptions} />
      </div>
    </>
  );
}
