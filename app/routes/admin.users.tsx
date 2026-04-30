import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessUserManagement,
  getAssignableUserRoles,
  isAdmin,
} from "@/lib/permissions";
import {
  getUserManagementSnapshot,
  listPendingUsers,
} from "@/lib/services/organization-service";

import { CreateUserForm } from "app/(app)/admin/create-user-form";
import { ExportUsersCsv } from "app/(app)/admin/export-csv";
import { PendingUsers } from "app/(app)/admin/pending-users";
import { AdminSubHeader } from "app/(app)/admin/sub-header";
import { UserSection } from "app/(app)/admin/user-section";

export async function ServerComponent() {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");
  if (!canAccessUserManagement(session)) throw redirect("/admin");

  const canReviewPendingUsers = isAdmin(session);
  const [snapshot, pendingUsers] = await Promise.all([
    getUserManagementSnapshot(session),
    canReviewPendingUsers ? listPendingUsers() : Promise.resolve([]),
  ]);
  const roleOptions = getAssignableUserRoles(session);

  const teamOptions = snapshot.teams.map((t) => ({ id: t.id, name: t.name }));
  const zoneOptions = snapshot.zones.map((z) => ({
    id: z.id,
    name: z.name,
    teamId: z.teamId,
    teamName: z.teamName,
  }));
  const regionOptions = snapshot.regions.map((r) => ({
    id: r.id,
    name: r.name,
    teamId: r.teamId,
    zoneId: r.zoneId,
    zoneName: r.zoneName,
  }));

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <AdminSubHeader
          title={`Người dùng (${snapshot.users.length})`}
          description="Quản lý tài khoản người dùng trong phạm vi quyền của bạn"
        />
        <ExportUsersCsv
          users={snapshot.users}
          teams={teamOptions}
          zones={zoneOptions.map((z) => ({ id: z.id, name: z.name }))}
          regions={regionOptions.map((r) => ({ id: r.id, name: r.name }))}
        />
      </div>
      {pendingUsers.length > 0 && <PendingUsers users={pendingUsers} />}
      <div className="space-y-3">
        <UserSection
          currentUser={session}
          users={snapshot.users}
          teams={teamOptions}
          zones={zoneOptions}
          regions={regionOptions}
          roleOptions={roleOptions}
        />
        <CreateUserForm
          teams={teamOptions}
          zones={zoneOptions}
          regions={regionOptions}
          roleOptions={roleOptions}
        />
      </div>
    </>
  );
}
