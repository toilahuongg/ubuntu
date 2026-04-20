import { redirect } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  TrendingUp,
  Users,
} from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import type { Role } from "@/lib/domain";
import { canAccessAnalytics } from "@/lib/permissions";
import { getUserOrgContext } from "@/lib/services/organization-service";
import {
  getAnalyticsScopeInfo,
  getCompletionTrend,
  getTaskDistribution,
  type TaskDistributionEntry,
  type TrendPoint,
} from "@/lib/services/analytics-service";
import { AnalyticsChart } from "./analytics-chart";

export default async function AnalyticsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!canAccessAnalytics(session)) {
    redirect("/dashboard");
  }

  const [analyticsScope, trend, taskDistribution, orgContext] = await Promise.all([
    getAnalyticsScopeInfo(session),
    getCompletionTrend(session, 14),
    getTaskDistribution(session, 30, 10),
    getUserOrgContext(session),
  ]);

  if (!analyticsScope) {
    redirect("/dashboard");
  }

  const totalCompletions = trend.reduce(
    (sum, point) => sum + point.completed,
    0,
  );
  const averagePerDay =
    trend.length > 0 ? Math.round((totalCompletions / trend.length) * 10) / 10 : 0;
  const bestDay = trend.reduce<TrendPoint | null>((best, point) => {
    if (!best || point.completed > best.completed) return point;
    return best;
  }, null);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold">
              {analyticsScope.title}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {formatScopeName(session.role, orgContext)}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-overlay-subtle px-2 py-0.5 text-[11px] font-semibold text-foreground/70">
          {analyticsScope.shortLabel}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label={analyticsScope.subjectLabel}
          value={analyticsScope.subjectCount.toLocaleString("vi-VN")}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="14 ngày"
          value={totalCompletions.toLocaleString("vi-VN")}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Trung bình/ngày"
          value={averagePerDay.toLocaleString("vi-VN")}
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Ngày tốt nhất"
          value={
            bestDay && bestDay.completed > 0
              ? formatShortDate(bestDay.date)
              : "Chưa có"
          }
        />
      </div>

      <section className="glass-card overflow-hidden p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold">
              Xu hướng hoàn thành
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {analyticsScope.description}
            </p>
          </div>
          <span className="rounded-md bg-overlay-subtle px-2 py-0.5 text-[11px] font-semibold text-foreground/70">
            {totalCompletions.toLocaleString("vi-VN")} lượt
          </span>
        </div>
        <AnalyticsChart data={trend} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Nhiệm vụ nổi bật trong 30 ngày
        </h2>
        {taskDistribution.length > 0 ? (
          <TaskDistributionList entries={taskDistribution} />
        ) : (
          <div className="glass-card py-10 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu hoàn thành trong 30 ngày gần đây.
          </div>
        )}
      </section>
    </div>
  );
}

type OrgContext = Awaited<ReturnType<typeof getUserOrgContext>>;

function formatScopeName(role: Role, orgContext: OrgContext) {
  if (role === "TEAM_LEAD") {
    return formatOrgName(orgContext.team, "Nhóm của tôi");
  }
  if (role === "ZONE_LEAD") {
    return formatOrgName(orgContext.zone, "Địa vực của tôi");
  }
  if (role === "REGIONAL_LEAD") {
    return formatOrgName(orgContext.region, "Khu vực của tôi");
  }
  return "Cá nhân";
}

function formatOrgName(
  org: { code: string; name: string } | null,
  fallback: string,
) {
  return org ? `${org.name} (${org.code})` : fallback;
}

function formatShortDate(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass-card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function TaskDistributionList({
  entries,
}: {
  entries: TaskDistributionEntry[];
}) {
  const maxCount = Math.max(...entries.map((entry) => entry.completionCount), 1);

  return (
    <div className="glass-card divide-y divide-border overflow-hidden">
      {entries.map((entry, index) => {
        const width = `${Math.max(
          8,
          Math.round((entry.completionCount / maxCount) * 100),
        )}%`;

        return (
          <div key={entry.taskId} className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-overlay-subtle text-[11px] font-bold">
                  {index + 1}
                </span>
                <p className="truncate text-sm font-medium" title={entry.title}>
                  {entry.title}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums">
                {entry.completionCount.toLocaleString("vi-VN")}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-overlay-subtle">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
