import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessUserManagement,
  getAssignableUserRoles,
} from "@/lib/permissions";
import {
  getUserManagementSnapshot,
  listPendingUsersForReview,
} from "@/lib/services/organization-service";

import { CreateUserForm } from "../create-user-form";
import { ExportUsersCsv } from "../export-csv";
import { PendingUsers } from "../pending-users";
import { AdminSubHeader } from "../sub-header";
import { UserSection } from "../user-section";

export default async function AdminUsersPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canAccessUserManagement(session)) redirect("/admin");

  const [snapshot, pendingUsers] = await Promise.all([
    getUserManagementSnapshot(session),
    listPendingUsersForReview(session),
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
      {pendingUsers.length > 0 && (
        <PendingUsers regions={regionOptions} users={pendingUsers} />
      )}
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
