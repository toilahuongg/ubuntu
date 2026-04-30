import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessTeamStructure,
  canCreateTeamStructure,
} from "@/lib/permissions";
import { getStructureSnapshot } from "@/lib/services/organization-service";

import { CreateTeamForm } from "app/(app)/admin/create-team-form";
import { AdminSubHeader } from "app/(app)/admin/sub-header";
import { TeamSection } from "app/(app)/admin/team-section";

export async function ServerComponent() {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");
  if (!canAccessTeamStructure(session)) throw redirect("/admin");

  const snapshot = await getStructureSnapshot(session);
  const canCreateTeam = canCreateTeamStructure(session);

  return (
    <>
      <AdminSubHeader
        title={`Nhóm (${snapshot.teams.length})`}
        description="Quản lý các nhóm trong tổ chức"
      />
      <div className="space-y-3">
        <TeamSection teams={snapshot.teams} />
        {canCreateTeam && <CreateTeamForm />}
      </div>
    </>
  );
}
