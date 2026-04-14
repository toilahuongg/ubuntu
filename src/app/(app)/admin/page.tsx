import { redirect } from "next/navigation";
import { Shield, Users, MapPin, Building2 } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessManagement } from "@/lib/permissions";
import {
  getAdminSnapshot,
  listPendingUsers,
} from "@/lib/services/organization-service";
import { PendingUsers } from "./pending-users";
import { TeamSection } from "./team-section";
import { RegionSection } from "./region-section";
import { UserSection } from "./user-section";
import { CreateTeamForm } from "./create-team-form";
import { CreateRegionForm } from "./create-region-form";

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!canAccessManagement(session)) {
    redirect("/dashboard");
  }

  const [snapshot, pendingUsers] = await Promise.all([
    getAdminSnapshot(),
    listPendingUsers(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <h1 className="font-display text-xl font-bold">Quản Trị</h1>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card flex flex-col items-center p-3">
          <Building2 className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{snapshot.teams.length}</p>
          <p className="text-[10px] text-muted-foreground">Nhóm</p>
        </div>
        <div className="glass-card flex flex-col items-center p-3">
          <MapPin className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{snapshot.regions.length}</p>
          <p className="text-[10px] text-muted-foreground">Khu vực</p>
        </div>
        <div className="glass-card flex flex-col items-center p-3">
          <Users className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{snapshot.users.length}</p>
          <p className="text-[10px] text-muted-foreground">Người dùng</p>
        </div>
      </div>

      {/* Pending users */}
      {pendingUsers.length > 0 && <PendingUsers users={pendingUsers} />}

      {/* Teams */}
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Nhóm ({snapshot.teams.length})
        </h2>
        <TeamSection teams={snapshot.teams} />
        <div className="mt-3">
          <CreateTeamForm />
        </div>
      </section>

      {/* Regions */}
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Khu vực ({snapshot.regions.length})
        </h2>
        <RegionSection regions={snapshot.regions} />
        <div className="mt-3">
          <CreateRegionForm teams={snapshot.teams.map((t) => ({ id: t.id, name: t.name }))} />
        </div>
      </section>

      {/* Users */}
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Người dùng ({snapshot.users.length})
        </h2>
        <UserSection users={snapshot.users} />
      </section>
    </div>
  );
}
