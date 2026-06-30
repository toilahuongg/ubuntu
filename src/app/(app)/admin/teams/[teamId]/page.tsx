import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getTodayDateKey } from "@/lib/dates";
import { canAccessTeamStructure } from "@/lib/permissions";
import { buildAdminOperationsView } from "@/lib/services/admin-operations-service";
import { getStructureSnapshot } from "@/lib/services/organization-service";

import { OperationsDashboard } from "../../operations-dashboard";
import { AdminSubHeader } from "../../sub-header";

type TeamDetailPageProps = {
  params: Promise<{
    teamId: string;
  }>;
};

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessTeamStructure(session)) redirect("/admin");

  const { teamId } = await params;
  const dateKey = getTodayDateKey();
  const [snapshot, operations] = await Promise.all([
    getStructureSnapshot(session),
    buildAdminOperationsView(session, dateKey),
  ]);
  const team = snapshot.teams.find((item) => item.id === teamId);
  if (!team) redirect("/admin/teams");

  return (
    <>
      <AdminSubHeader
        backHref="/admin/teams"
        title={team.name}
        description="Tiến độ thành viên trong chi hội"
      />
      <OperationsDashboard
        data={operations}
        initialSelection={{
          regionId: null,
          teamId: team.id,
          zoneId: null,
        }}
        showMemberProgress
      />
    </>
  );
}
