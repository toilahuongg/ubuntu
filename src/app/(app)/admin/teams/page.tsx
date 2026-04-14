import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessManagement } from "@/lib/permissions";
import { getAdminSnapshot } from "@/lib/services/organization-service";

import { CreateTeamForm } from "../create-team-form";
import { AdminSubHeader } from "../sub-header";
import { TeamSection } from "../team-section";

export default async function AdminTeamsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessManagement(session)) redirect("/admin");

  const snapshot = await getAdminSnapshot(session);

  return (
    <>
      <AdminSubHeader
        title={`Nhóm (${snapshot.teams.length})`}
        description="Quản lý các nhóm trong tổ chức"
      />
      <div className="space-y-3">
        <TeamSection teams={snapshot.teams} />
        <CreateTeamForm />
      </div>
    </>
  );
}
