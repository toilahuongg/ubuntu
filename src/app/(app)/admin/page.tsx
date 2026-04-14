import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Shield,
  Users,
  MapPin,
  Building2,
  Layers,
  MessageCircle,
  ListChecks,
  ChevronRight,
} from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessManagement,
  canAccessRegionManagement,
  canAccessZoneManagement,
} from "@/lib/permissions";
import {
  getAdminSnapshot,
  listPendingUsers,
} from "@/lib/services/organization-service";
import { MembersRoster } from "./members-roster";
import { PendingUsers } from "./pending-users";
import { TeamSection } from "./team-section";
import { ZoneSection } from "./zone-section";
import { RegionSection } from "./region-section";
import { UserSection } from "./user-section";
import { CreateTeamForm } from "./create-team-form";
import { CreateZoneForm } from "./create-zone-form";
import { CreateRegionForm } from "./create-region-form";
import { CreateUserForm } from "./create-user-form";
import { ExportUsersCsv } from "./export-csv";
import { TelegramSection } from "./telegram-section";

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const isTeamLead = canAccessManagement(session);
  const isZoneLead = canAccessZoneManagement(session);
  const isRegionalLead = canAccessRegionManagement(session);

  if (!isTeamLead && !isZoneLead && !isRegionalLead) {
    redirect("/dashboard");
  }

  if (!isTeamLead) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h1 className="font-display text-xl font-bold">Quản Trị</h1>
        </div>
        <Link
          href="/templates"
          className="glass-card flex items-center justify-between p-4 transition-colors hover:bg-overlay-subtle"
        >
          <div className="flex items-center gap-3">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-semibold">Nhiệm vụ</p>
              <p className="text-xs text-muted-foreground">
                Quản lý mẫu nhiệm vụ
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <section id="telegram" className="scroll-mt-20">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            Thông báo Telegram
          </h2>
          <TelegramSection session={session} />
        </section>
        <MembersRoster actor={session} />
      </div>
    );
  }

  const [snapshot, pendingUsers] = await Promise.all([
    getAdminSnapshot(session),
    listPendingUsers(),
  ]);

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
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <h1 className="font-display text-xl font-bold">Quản Trị</h1>
      </div>

      {/* Stats overview + anchor nav */}
      <nav
        aria-label="Điều hướng mục quản trị"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        <a
          href="#teams"
          className="glass-card flex flex-col items-center p-3 transition-colors hover:bg-overlay-subtle"
        >
          <Building2 className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{snapshot.teams.length}</p>
          <p className="text-[10px] text-muted-foreground">Nhóm</p>
        </a>
        <a
          href="#zones"
          className="glass-card flex flex-col items-center p-3 transition-colors hover:bg-overlay-subtle"
        >
          <Layers className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{snapshot.zones.length}</p>
          <p className="text-[10px] text-muted-foreground">Địa vực</p>
        </a>
        <a
          href="#regions"
          className="glass-card flex flex-col items-center p-3 transition-colors hover:bg-overlay-subtle"
        >
          <MapPin className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{snapshot.regions.length}</p>
          <p className="text-[10px] text-muted-foreground">Khu vực</p>
        </a>
        <a
          href="#users"
          className="glass-card flex flex-col items-center p-3 transition-colors hover:bg-overlay-subtle"
        >
          <Users className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{snapshot.users.length}</p>
          <p className="text-[10px] text-muted-foreground">Người dùng</p>
        </a>
      </nav>

      <Link
        href="/templates"
        className="glass-card flex items-center justify-between p-4 transition-colors hover:bg-overlay-subtle"
      >
        <div className="flex items-center gap-3">
          <ListChecks className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-semibold">Nhiệm vụ</p>
            <p className="text-xs text-muted-foreground">
              Quản lý mẫu nhiệm vụ
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {pendingUsers.length > 0 && <PendingUsers users={pendingUsers} />}

      <MembersRoster actor={session} />

      <section id="teams" className="scroll-mt-20">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Nhóm ({snapshot.teams.length})
        </h2>
        <TeamSection teams={snapshot.teams} />
        <div className="mt-3">
          <CreateTeamForm />
        </div>
      </section>

      <section id="zones" className="scroll-mt-20">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Địa vực ({snapshot.zones.length})
        </h2>
        <ZoneSection zones={snapshot.zones} />
        <div className="mt-3">
          <CreateZoneForm teams={teamOptions} />
        </div>
      </section>

      <section id="regions" className="scroll-mt-20">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Khu vực ({snapshot.regions.length})
        </h2>
        <RegionSection regions={snapshot.regions} />
        <div className="mt-3">
          <CreateRegionForm
            zones={snapshot.zones.map((z) => ({
              id: z.id,
              name: z.name,
              teamName: z.teamName,
            }))}
          />
        </div>
      </section>

      <section id="telegram" className="scroll-mt-20">
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          Thông báo Telegram
        </h2>
        <TelegramSection session={session} />
      </section>

      <section id="users" className="scroll-mt-20">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Người dùng ({snapshot.users.length})
          </h2>
          <ExportUsersCsv
            users={snapshot.users}
            teams={teamOptions}
            zones={zoneOptions.map((z) => ({ id: z.id, name: z.name }))}
            regions={regionOptions.map((r) => ({ id: r.id, name: r.name }))}
          />
        </div>
        <UserSection
          currentUserId={session.id}
          users={snapshot.users}
          teams={teamOptions}
          zones={zoneOptions}
          regions={regionOptions}
        />
        <div className="mt-3">
          <CreateUserForm
            teams={teamOptions}
            zones={zoneOptions}
            regions={regionOptions}
          />
        </div>
      </section>
    </div>
  );
}
