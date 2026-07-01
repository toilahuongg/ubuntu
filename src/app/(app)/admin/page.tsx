import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Layers,
  MapPin,
  MessageCircle,
  ShoppingBag,
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
  canAccessUserManagement,
  canAccessZoneManagement,
  canManageTasks,
} from "@/lib/permissions";
import { buildAdminOperationsView } from "@/lib/services/admin-operations-service";
import {
  getAdminSnapshot,
  listPendingUsersForReview,
} from "@/lib/services/organization-service";

import { OperationsDashboard } from "./operations-dashboard";
import { getScopedProgressItem } from "./progress-links";

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
  const canManageUsers = canAccessUserManagement(session);
  const isZoneLead = canAccessZoneManagement(session);
  const isRegionalLead = canAccessRegionManagement(session);
  const telegramEnabled = getOptionalEnv().telegramNotificationsEnabled;
  const scopedProgressItem = getScopedProgressItem(session);

  if (!canManageStructure && !isZoneLead && !isRegionalLead) {
    redirect("/dashboard");
  }

  const dateKey = getTodayDateKey();

  if (!canManageStructure) {
    const operations = await buildAdminOperationsView(session, dateKey);
    const scopedStructureItems: NavItem[] = scopedProgressItem
      ? [scopedProgressItem]
      : [];

    return (
      <>
        <AdminTitle description={`Xin chào, ${session.fullName}`} title="Tổng quan" />
        <OperationsDashboard data={operations} />
        {scopedStructureItems.length > 0 && (
          <nav className="grid gap-2" aria-label="Cấu trúc trong phạm vi">
            {scopedStructureItems.map((item) => (
              <AdminNavLink key={item.href} {...item} />
            ))}
          </nav>
        )}
        <nav className="grid gap-2" aria-label="Công cụ vận hành">
          {canManageTasks(session) && (
            <AdminNavLink
              href="/templates"
              icon={ClipboardList}
              label="Nhiệm vụ"
              description={
                isZoneLead
                  ? "Quản lý nhiệm vụ trong địa vực"
                  : "Quản lý mẫu nhiệm vụ"
              }
            />
          )}
          {canManageUsers && (
            <AdminNavLink
              href="/admin/users"
              icon={Users}
              label="Thành viên"
              description={
                isRegionalLead
                  ? "Quản lý thành viên trong khu vực"
                  : "Quản lý thành viên trong phạm vi"
              }
            />
          )}
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
    const [snapshot, pendingUsers, operations] = await Promise.all([
      getAdminSnapshot(session),
      listPendingUsersForReview(session),
      buildAdminOperationsView(session, dateKey),
    ]);

    return (
      <>
        <AdminTitle
          description={`Xin chào, ${session.fullName}`}
          title="Tổng quan"
        />
        <ManagementHome
          pendingCount={pendingUsers.length}
          progressItem={scopedProgressItem}
          role={session.role}
          snapshot={snapshot}
          telegramEnabled={telegramEnabled}
        />
        <OperationsDashboard data={operations} />
      </>
    );
  }

  const [snapshot, pendingUsers, operations] = await Promise.all([
    getAdminSnapshot(session),
    listPendingUsersForReview(session),
    buildAdminOperationsView(session, dateKey),
  ]);

  return (
    <>
      <AdminTitle
        description={`Xin chào, ${session.fullName}`}
        title="Tổng quan"
      />
      <ManagementHome
        pendingCount={pendingUsers.length}
        progressItem={scopedProgressItem}
        role={session.role === "ZONE_LEAD" ? "ZONE_LEAD" : "ADMIN"}
        snapshot={snapshot}
        telegramEnabled={telegramEnabled}
      />
      <OperationsDashboard data={operations} />
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
    <div className="flex items-end justify-between gap-3">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-primary">
        <Shield className="h-5 w-5" />
      </div>
    </div>
  );
}

function ManagementHome({
  pendingCount,
  progressItem,
  role,
  snapshot,
  telegramEnabled,
}: {
  pendingCount: number;
  progressItem?: NavItem | null;
  role: "ADMIN" | "TEAM_LEAD" | "ZONE_LEAD";
  snapshot: Awaited<ReturnType<typeof getAdminSnapshot>>;
  telegramEnabled: boolean;
}) {
  const isAdmin = role === "ADMIN";
  const primaryTeam = snapshot.teams[0];
  const operationItems: NavItem[] = [
    {
      href: "/templates",
      icon: ClipboardList,
      label: "Nhiệm vụ",
      description: isAdmin
        ? "Quản lý mẫu nhiệm vụ toàn hệ thống"
        : "Quản lý mẫu nhiệm vụ trong nhóm",
    },
    {
      href: "/admin/dtt",
      icon: Shield,
      label: "Trường học ĐTT",
      description: "Quản lý lớp học, học viên và gán nhanh nhiệm vụ",
    },
    {
      href: "/admin/cosmetics",
      icon: ShoppingBag,
      label: "Cửa hàng",
      description: "Quản lý vật phẩm, giá bán và trạng thái",
    },
  ];

  if (role === "TEAM_LEAD") {
    operationItems.push({
      href: "/admin/campaigns",
      icon: CalendarDays,
      label: "Chiến dịch ngày",
      description: "Chọn nhiệm vụ đặc biệt cho hôm nay",
    });
  }

  if (telegramEnabled) {
    operationItems.push({
      href: "/admin/telegram",
      icon: MessageCircle,
      label: "Thông báo Telegram",
      description: "Kết nối và quản lý kênh Telegram",
    });
  }

  const sections: NavSection[] = [
    ...(progressItem
      ? [
          {
            title: "Tiến độ",
            items: [progressItem],
          },
        ]
      : []),
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
          note: pendingCount > 0 ? `${pendingCount} chờ duyệt` : "Tổng tài khoản",
          value: snapshot.users.length,
        },
      ]
    : [
        {
          href: "/admin/users",
          icon: Users,
          label: "TĐ",
          note: role === "ZONE_LEAD" ? "Trong địa vực của bạn" : "Trong nhóm của bạn",
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
          note: role === "ZONE_LEAD" ? "Địa vực của bạn" : primaryTeam?.name ?? "Trong phạm vi nhóm",
          value: snapshot.zones.length,
        },
        {
          href: "/admin/regions",
          icon: MapPin,
          label: "Khu vực",
          note: role === "ZONE_LEAD" ? "Trong địa vực của bạn" : "Trong nhóm của bạn",
          value: snapshot.regions.length,
        },
      ];

  return (
    <div className="space-y-5">
      <nav
        aria-label="Tổng quan quản trị"
        className="grid grid-cols-4 gap-1.5"
      >
        {topStats.map((item) => (
          <StatCard key={`${role}-${item.href}-${item.label}`} {...item} />
        ))}
      </nav>

      <div className="space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h2 className="font-display text-sm font-semibold text-foreground">
                {section.title}
              </h2>
            </div>
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
      className={`glass-card group min-h-[6.25rem] p-2.5 text-left transition-colors duration-150 hover:border-primary/35 hover:bg-accent/35 ${
        tone === "alert" ? "ring-1 ring-destructive/20" : ""
      }`}
    >
      <div className="flex justify-center">
        <div
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
            tone === "alert"
              ? "border-destructive/25 bg-destructive/10 text-destructive"
              : "border-border/50 bg-muted text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-center text-xl font-semibold leading-none">{value}</p>
      <p className="mt-1 truncate text-center text-[11px] font-medium text-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-center text-[10px] leading-4 text-muted-foreground">
        {note}
      </p>
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
      className="glass-card group flex items-center justify-between p-4 transition-colors duration-150 hover:border-primary/35 hover:bg-accent/35"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">{label}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge ? (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
            {badge}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
