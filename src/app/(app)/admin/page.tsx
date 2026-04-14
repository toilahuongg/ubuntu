import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Layers,
  ListChecks,
  MapPin,
  MessageCircle,
  Shield,
  UserCog,
  Users,
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

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  badge?: number;
};

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
      <>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h1 className="font-display text-xl font-bold">Quản Trị</h1>
        </div>
        <nav className="space-y-2" aria-label="Khu vực quản trị">
          <AdminNavLink
            href="/templates"
            icon={ListChecks}
            label="Nhiệm vụ"
            description="Quản lý mẫu nhiệm vụ"
          />
          <AdminNavLink
            href="/admin/telegram"
            icon={MessageCircle}
            label="Thông báo Telegram"
            description="Kết nối và quản lý kênh Telegram"
          />
        </nav>
        <MembersRoster actor={session} />
      </>
    );
  }

  const [snapshot, pendingUsers] = await Promise.all([
    getAdminSnapshot(session),
    listPendingUsers(),
  ]);

  const navItems: NavItem[] = [
    {
      href: "/templates",
      icon: ListChecks,
      label: "Nhiệm vụ",
      description: "Quản lý mẫu nhiệm vụ",
    },
    {
      href: "/admin/teams",
      icon: Building2,
      label: "Nhóm",
      description: `${snapshot.teams.length} nhóm`,
    },
    {
      href: "/admin/zones",
      icon: Layers,
      label: "Địa vực",
      description: `${snapshot.zones.length} địa vực`,
    },
    {
      href: "/admin/regions",
      icon: MapPin,
      label: "Khu vực",
      description: `${snapshot.regions.length} khu vực`,
    },
    {
      href: "/admin/users",
      icon: UserCog,
      label: "Người dùng",
      description: `${snapshot.users.length} người dùng`,
      badge: pendingUsers.length,
    },
    {
      href: "/admin/telegram",
      icon: MessageCircle,
      label: "Thông báo Telegram",
      description: "Kết nối và quản lý kênh Telegram",
    },
  ];

  return (
    <>
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <h1 className="font-display text-xl font-bold">Quản Trị</h1>
      </div>

      <div className="space-y-3">
        <nav
          aria-label="Tổng quan quản trị"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          <StatCard
            href="/admin/teams"
            icon={Building2}
            value={snapshot.teams.length}
            label="Nhóm"
          />
          <StatCard
            href="/admin/zones"
            icon={Layers}
            value={snapshot.zones.length}
            label="Địa vực"
          />
          <StatCard
            href="/admin/regions"
            icon={MapPin}
            value={snapshot.regions.length}
            label="Khu vực"
          />
          <StatCard
            href="/admin/users"
            icon={Users}
            value={snapshot.users.length}
            label="Người dùng"
          />
        </nav>

        <nav className="space-y-2" aria-label="Khu vực quản trị">
          {navItems.map((item) => (
            <AdminNavLink key={item.href} {...item} />
          ))}
        </nav>
      </div>

      <MembersRoster actor={session} />
    </>
  );
}

function StatCard({
  href,
  icon: Icon,
  value,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card flex flex-col items-center p-3 transition-colors hover:bg-overlay-subtle"
    >
      <Icon className="mb-1 h-4 w-4 text-muted-foreground" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </Link>
  );
}

function AdminNavLink({
  href,
  icon: Icon,
  label,
  description,
  badge,
}: NavItem) {
  return (
    <Link
      href={href}
      className="glass-card flex items-center justify-between p-4 transition-colors hover:bg-overlay-subtle"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge ? (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
            {badge}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
