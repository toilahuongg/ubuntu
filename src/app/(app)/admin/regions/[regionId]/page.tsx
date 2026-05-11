import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getTodayDateKey } from "@/lib/dates";
import { canAccessRegionStructure } from "@/lib/permissions";
import { buildAdminOperationsView } from "@/lib/services/admin-operations-service";
import { getStructureSnapshot } from "@/lib/services/organization-service";

import { OperationsDashboard } from "../../operations-dashboard";
import { RegionDetailActions } from "../../region-detail-actions";
import { AdminSubHeader } from "../../sub-header";

type RegionDetailPageProps = {
  params: Promise<{
    regionId: string;
  }>;
};

export default async function RegionDetailPage({
  params,
}: RegionDetailPageProps) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessRegionStructure(session)) redirect("/admin");

  const { regionId } = await params;
  const dateKey = getTodayDateKey();
  const [snapshot, operations] = await Promise.all([
    getStructureSnapshot(session),
    buildAdminOperationsView(session, dateKey),
  ]);
  const region = snapshot.regions.find((item) => item.id === regionId);
  if (!region) redirect("/admin/regions");

  return (
    <>
      <AdminSubHeader
        backHref={`/admin/regions?zoneId=${encodeURIComponent(region.zoneId)}`}
        title={region.name}
        description="Tiến độ thành viên trong khu vực"
      />
      <RegionDetailActions region={region} />
      <OperationsDashboard
        data={operations}
        initialSelection={{
          regionId: region.id,
          teamId: region.teamId,
          zoneId: region.zoneId,
        }}
        showMemberProgress
      />
    </>
  );
}
