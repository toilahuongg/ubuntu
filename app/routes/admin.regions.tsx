import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessRegionStructure,
  canCreateRegionStructure,
} from "@/lib/permissions";
import { getStructureSnapshot } from "@/lib/services/organization-service";

import { CreateRegionForm } from "app/(app)/admin/create-region-form";
import { RegionSection } from "app/(app)/admin/region-section";
import { AdminSubHeader } from "app/(app)/admin/sub-header";

export async function ServerComponent() {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");
  if (!canAccessRegionStructure(session)) throw redirect("/admin");

  const snapshot = await getStructureSnapshot(session);
  const zones = snapshot.zones.map((z) => ({
    id: z.id,
    name: z.name,
    teamName: z.teamName,
  }));
  const canCreateRegion = canCreateRegionStructure(session);

  return (
    <>
      <AdminSubHeader
        title={`Khu vực (${snapshot.regions.length})`}
        description="Quản lý các khu vực theo địa vực"
      />
      <div className="space-y-3">
        <RegionSection regions={snapshot.regions} />
        {canCreateRegion && <CreateRegionForm zones={zones} />}
      </div>
    </>
  );
}
