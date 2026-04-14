import { redirect } from "next/navigation";
import { Layers, Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessZoneManagement } from "@/lib/permissions";
import { buildDashboardView } from "@/lib/tasks/dashboard-service";
import { getZoneById } from "@/lib/services/organization-service";
import { getTodayDateKey, formatDateLabel } from "@/lib/dates";
import { ZoneRoster } from "./zone-roster";

export default async function ZonePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!canAccessZoneManagement(session)) {
    redirect("/dashboard");
  }

  const dateKey = getTodayDateKey();
  const [data, zone] = await Promise.all([
    buildDashboardView(session, dateKey),
    session.zoneId ? getZoneById(session.zoneId) : null,
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5" />
        <div>
          <h1 className="font-display text-xl font-bold">
            {zone?.name ?? "Địa Vực của tôi"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {formatDateLabel(dateKey)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Thành viên"
          value={data.highlights.visibleUsers}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Hoàn thành"
          value={`${data.highlights.completionPercent}%`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Đã nộp"
          value={data.highlights.completed}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Còn lại"
          value={data.highlights.pending}
        />
      </div>

      {data.cards.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có nhiệm vụ nào hôm nay.
          </p>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Thành viên ({data.roster.length})
          </h2>
          <ZoneRoster roster={data.roster} cards={data.cards} />
        </section>
      )}
    </div>
  );
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
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
