import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/services/task-service";
import { getTodayDateKey, formatDateLabel } from "@/lib/dates";
import { ROLE_LABELS } from "@/lib/domain";

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const dateKey = getTodayDateKey();
  const data = await getDashboardData(session, dateKey);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      {/* Date header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>{formatDateLabel(dateKey)}</span>
      </div>

      {/* Highlights */}
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

      {/* Task cards */}
      {data.cards.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Nhiệm vụ hôm nay
          </h2>
          <div className="space-y-2">
            {data.cards.map((card) => (
              <Link
                key={card.id}
                href={`/tasks/${card.id}`}
                className="glass-card card-hover flex items-center justify-between p-4 active:bg-overlay-medium active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold" title={card.title}>
                    {card.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {card.completionCount}/{card.totalCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(card.deadlineAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {card.expReward > 0 && (
                      <span className="font-medium text-foreground/70">
                        +{card.expReward} XP
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  {card.myCompletionCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold">
                      {card.myCompletionCount}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.cards.length === 0 && (
        <div className="glass-card flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có nhiệm vụ nào hôm nay.
          </p>
        </div>
      )}

      {/* Roster */}
      {data.roster.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Thành viên
          </h2>
          <div className="glass-card divide-y divide-border overflow-hidden">
            {data.roster.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={member.fullName}>
                    {member.fullName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] ?? member.role}
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-3 whitespace-nowrap text-xs">
                  <span className="text-foreground/70">
                    {member.completed} xong
                  </span>
                  {member.pending > 0 && (
                    <span className="text-muted-foreground">
                      {member.pending} chờ
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
