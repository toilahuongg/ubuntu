import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessRegionStructure,
  canCreateRegionStructure,
} from "@/lib/permissions";
import { getStructureSnapshot } from "@/lib/services/organization-service";

import { CreateRegionForm } from "../create-region-form";
import { RegionSection } from "../region-section";
import { AdminSubHeader } from "../sub-header";

export default async function AdminRegionsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessRegionStructure(session)) redirect("/admin");

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
