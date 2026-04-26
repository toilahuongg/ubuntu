import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Layers,
  ListChecks,
  MapPin,
  MessageCircle,
  Sparkles,
  Shield,
  UserCog,
  Users,
} from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { getTodayDateKey } from "@/lib/dates";
import { getOptionalEnv } from "@/lib/env";
import {
  canAccessManagement,
  canAccessRegionManagement,
  canAccessZoneManagement,
} from "@/lib/permissions";
import { buildAdminOperationsView } from "@/lib/services/admin-operations-service";
import {
  getAdminSnapshot,
  listPendingUsers,
} from "@/lib/services/organization-service";

import { OperationsDashboard } from "./operations-dashboard";

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  badge?: number;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type StatItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  note: string;
  tone?: "default" | "alert";
  value: number;
};

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const canManageStructure = canAccessManagement(session);
  const isZoneLead = canAccessZoneManagement(session);
  const isRegionalLead = canAccessRegionManagement(session);
  const telegramEnabled = getOptionalEnv().telegramNotificationsEnabled;

  if (!canManageStructure && !isZoneLead && !isRegionalLead) {
    redirect("/dashboard");
  }

  if (!canManageStructure) {
    const dateKey = getTodayDateKey();
    const operations = await buildAdminOperationsView(session, dateKey);
    const scopedStructureItems: NavItem[] = isZoneLead
      ? [
          {
            href: "/admin/regions",
            icon: MapPin,
            label: "Khu vực",
            description: "Quản lý các khu vực trong địa vực",
          },
        ]
      : [];

    return (
      <>
        <AdminTitle
          description="Theo dõi tiến độ thành viên và xử lý nhanh nhiệm vụ trong phạm vi của bạn."
          title="Vận hành"
        />
        <OperationsDashboard data={operations} />
        {scopedStructureItems.length > 0 && (
          <nav className="grid gap-2" aria-label="Cấu trúc trong phạm vi">
            {scopedStructureItems.map((item) => (
              <AdminNavLink key={item.href} {...item} />
            ))}
          </nav>
        )}
        <nav className="grid gap-2" aria-label="Công cụ vận hành">
          <AdminNavLink
            href="/templates"
            icon={ListChecks}
            label="Nhiệm vụ"
            description="Quản lý mẫu nhiệm vụ trong phạm vi"
          />
          {telegramEnabled && (
            <AdminNavLink
              href="/admin/telegram"
              icon={MessageCircle}
              label="Thông báo Telegram"
              description="Kết nối và quản lý kênh Telegram"
            />
          )}
        </nav>
      </>
    );
  }

  if (session.role === "TEAM_LEAD") {
    const dateKey = getTodayDateKey();
    const [snapshot, pendingUsers, operations] = await Promise.all([
      getAdminSnapshot(session),
      listPendingUsers(),
      buildAdminOperationsView(session, dateKey),
    ]);

    return (
      <>
        <AdminTitle
          description="Tổng quan tiến độ nhóm và các công cụ quản trị trong phạm vi NT."
          title="Quản trị nhóm"
        />
        <OperationsDashboard data={operations} />
        <ManagementHome
          pendingCount={pendingUsers.length}
          role={session.role}
          snapshot={snapshot}
          telegramEnabled={telegramEnabled}
        />
      </>
    );
  }

  const [snapshot, pendingUsers] = await Promise.all([
    getAdminSnapshot(session),
    listPendingUsers(),
  ]);

  return (
    <>
      <AdminTitle
        description="Trung tâm quản lý cấu trúc, người dùng và tích hợp hệ thống."
        title="Quản Trị"
      />
      <ManagementHome
        pendingCount={pendingUsers.length}
        role="ADMIN"
        snapshot={snapshot}
        telegramEnabled={telegramEnabled}
      />
    </>
  );
}

function AdminTitle({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Shield className="mt-0.5 h-5 w-5" />
      <div>
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ManagementHome({
  pendingCount,
  role,
  snapshot,
  telegramEnabled,
}: {
  pendingCount: number;
  role: "ADMIN" | "TEAM_LEAD";
  snapshot: Awaited<ReturnType<typeof getAdminSnapshot>>;
  telegramEnabled: boolean;
}) {
  const isAdmin = role === "ADMIN";
  const primaryTeam = snapshot.teams[0];
  const operationItems: NavItem[] = [
    {
      href: "/templates",
      icon: ListChecks,
      label: "Nhiệm vụ",
      description: isAdmin
        ? "Quản lý mẫu nhiệm vụ toàn hệ thống"
        : "Quản lý mẫu nhiệm vụ trong nhóm",
    },
  ];

  if (telegramEnabled) {
    operationItems.push({
      href: "/admin/telegram",
      icon: MessageCircle,
      label: "Thông báo Telegram",
      description: "Kết nối và quản lý kênh Telegram",
    });
  }

  const sections: NavSection[] = isAdmin
    ? [
        {
          title: "Cấu trúc",
          items: [
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
          ],
        },
        {
          title: "Người dùng",
          items: [
            {
              href: "/admin/users",
              icon: UserCog,
              label: "Người dùng",
              description: `${snapshot.users.length} người dùng`,
              badge: pendingCount,
            },
          ],
        },
        {
          title: "Vận hành",
          items: operationItems,
        },
        {
          title: "Trang bị",
          items: [
            {
              href: "/admin/cosmetics",
              icon: Sparkles,
              label: "Trang bị tên",
              description: "Quản lý cosmetic của người dùng",
            },
          ],
        },
      ]
    : [
        {
          title: "Phạm vi của tôi",
          items: [
            {
              href: "/admin/users",
              icon: UserCog,
              label: "Thành viên nhóm",
              description: `${snapshot.users.length} thành viên trong nhóm`,
              badge: pendingCount,
            },
          ],
        },
        {
          title: "Cấu trúc nhóm",
          items: [
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
          ],
        },
        {
          title: "Vận hành",
          items: operationItems,
        },
      ];

  const topStats: StatItem[] = isAdmin
    ? [
        {
          href: "/admin/teams",
          icon: Building2,
          label: "Nhóm",
          note: "Toàn hệ thống",
          value: snapshot.teams.length,
        },
        {
          href: "/admin/zones",
          icon: Layers,
          label: "Địa vực",
          note: "Đang hoạt động",
          value: snapshot.zones.length,
        },
        {
          href: "/admin/regions",
          icon: MapPin,
          label: "Khu vực",
          note: "Đang hoạt động",
          value: snapshot.regions.length,
        },
        {
          href: "/admin/users",
          icon: Users,
          label: "Người dùng",
          note: "Tổng tài khoản",
          value: snapshot.users.length,
        },
      ]
    : [
        {
          href: "/admin/users",
          icon: Users,
          label: "Thành viên",
          note: "Trong nhóm của bạn",
          value: snapshot.users.length,
        },
        {
          href: "/admin/users",
          icon: UserCog,
          label: "Chờ duyệt",
          note: pendingCount > 0 ? "Cần xử lý sớm" : "Không có tồn đọng",
          tone: pendingCount > 0 ? "alert" : "default",
          value: pendingCount,
        },
        {
          href: "/admin/zones",
          icon: Layers,
          label: "Địa vực",
          note: primaryTeam?.name ?? "Trong phạm vi nhóm",
          value: snapshot.zones.length,
        },
        {
          href: "/admin/regions",
          icon: MapPin,
          label: "Khu vực",
          note: "Trong nhóm của bạn",
          value: snapshot.regions.length,
        },
      ];

  return (
    <div className="space-y-4">
      <nav
        aria-label="Tổng quan quản trị"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {topStats.map((item) => (
          <StatCard key={`${role}-${item.href}-${item.label}`} {...item} />
        ))}
      </nav>

      <div className="space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h2>
            <nav className="grid gap-2" aria-label={section.title}>
              {section.items.map((item) => (
                <AdminNavLink key={item.href} {...item} />
              ))}
            </nav>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  href,
  icon: Icon,
  value,
  label,
  note,
  tone = "default",
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  note: string;
  tone?: "default" | "alert";
}) {
  return (
    <Link
      href={href}
      className={`glass-card flex flex-col items-center rounded-3xl p-3 text-center transition-colors hover:bg-overlay-subtle ${
        tone === "alert" ? "ring-1 ring-destructive/20" : ""
      }`}
    >
      <div
        className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full ${
          tone === "alert"
            ? "bg-destructive/10 text-destructive"
            : "bg-overlay-subtle text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold">{label}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>
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
