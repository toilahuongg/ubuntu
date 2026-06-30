import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getTodayDateKey } from "@/lib/dates";
import { canAccessZoneStructure } from "@/lib/permissions";
import { buildAdminOperationsView } from "@/lib/services/admin-operations-service";
import { getStructureSnapshot } from "@/lib/services/organization-service";

import { OperationsDashboard } from "../../operations-dashboard";
import { AdminSubHeader } from "../../sub-header";

type ZoneDetailPageProps = {
  params: Promise<{
    zoneId: string;
  }>;
};

export default async function ZoneDetailPage({ params }: ZoneDetailPageProps) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessZoneStructure(session)) redirect("/admin");

  const { zoneId } = await params;
  const dateKey = getTodayDateKey();
  const [snapshot, operations] = await Promise.all([
    getStructureSnapshot(session),
    buildAdminOperationsView(session, dateKey),
  ]);
  const zone = snapshot.zones.find((item) => item.id === zoneId);
  if (!zone) redirect("/admin/zones");

  return (
    <>
      <AdminSubHeader
        backHref="/admin/zones"
        title={zone.name}
        description="Tiến độ thành viên trong địa vực"
      />
      <OperationsDashboard
        data={operations}
        initialSelection={{
          regionId: null,
          teamId: zone.teamId,
          zoneId: zone.id,
        }}
        showMemberProgress
      />
    </>
  );
}
