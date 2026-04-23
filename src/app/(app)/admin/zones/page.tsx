import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessZoneStructure,
  canCreateZoneStructure,
} from "@/lib/permissions";
import { getStructureSnapshot } from "@/lib/services/organization-service";

import { CreateZoneForm } from "../create-zone-form";
import { AdminSubHeader } from "../sub-header";
import { ZoneSection } from "../zone-section";

export default async function AdminZonesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessZoneStructure(session)) redirect("/admin");

  const snapshot = await getStructureSnapshot(session);
  const teamOptions = snapshot.teams.map((t) => ({ id: t.id, name: t.name }));
  const canCreateZone = canCreateZoneStructure(session);

  return (
    <>
      <AdminSubHeader
        title={`Địa vực (${snapshot.zones.length})`}
        description="Quản lý các địa vực theo nhóm"
      />
      <div className="space-y-3">
        <ZoneSection zones={snapshot.zones} />
        {canCreateZone && <CreateZoneForm teams={teamOptions} />}
      </div>
    </>
  );
}
