import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";

import { formatDateLabel } from "@/lib/dates";
import { ROLE_LABELS, SCOPE_LABELS } from "@/lib/domain";
import type { LeaderDashboardView } from "@/lib/tasks/types";

export function LeaderDashboard({ data }: { data: LeaderDashboardView }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{formatDateLabel(data.date)}</span>
        </div>
        <span className="rounded-md bg-overlay-subtle px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
          {SCOPE_LABELS[data.scopeLabel]}
        </span>
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
                  <h3
                    className="truncate text-sm font-semibold"
                    title={card.title}
                  >
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
                  <p
                    className="truncate text-sm font-medium"
                    title={member.fullName}
                  >
                    {member.fullName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {ROLE_LABELS[member.role] ?? member.role}
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
