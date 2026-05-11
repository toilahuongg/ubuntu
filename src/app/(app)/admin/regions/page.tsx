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

type AdminRegionsPageProps = {
  searchParams?: Promise<{
    zoneId?: string | string[];
  }>;
};

export default async function AdminRegionsPage({
  searchParams,
}: AdminRegionsPageProps) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessRegionStructure(session)) redirect("/admin");

  const snapshot = await getStructureSnapshot(session);
  const zones = snapshot.zones.map((z) => ({
    id: z.id,
    name: z.name,
    teamName: z.teamName,
  }));
  const params = searchParams ? await searchParams : {};
  const requestedZoneId = Array.isArray(params.zoneId)
    ? params.zoneId[0]
    : params.zoneId;
  const selectedZone = requestedZoneId
    ? zones.find((zone) => zone.id === requestedZoneId)
    : undefined;
  const regions = selectedZone
    ? snapshot.regions.filter((region) => region.zoneId === selectedZone.id)
    : snapshot.regions;
  const canCreateRegion = canCreateRegionStructure(session);

  return (
    <>
      <AdminSubHeader
        title={`Khu vực (${regions.length})`}
        description={
          selectedZone
            ? `Các khu vực thuộc ${selectedZone.name}`
            : "Quản lý các khu vực theo địa vực"
        }
      />
      <div className="space-y-3">
        <RegionSection regions={regions} />
        {canCreateRegion && (
          <CreateRegionForm defaultZoneId={selectedZone?.id} zones={zones} />
        )}
      </div>
    </>
  );
}
