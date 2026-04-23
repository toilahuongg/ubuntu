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
import { SCOPE_LABELS } from "@/lib/domain";
import type { ActivityEntry } from "@/lib/tasks/activity-service";
import { TASK_TYPE_LABELS } from "@/lib/tasks/constants";
import type { LeaderDashboardView } from "@/lib/tasks/types";
import { ActivityFeed } from "./activity-feed";
import { GoalNoticeBanner } from "./goal-notice-banner";
import { TaskProgressBadge } from "./task-progress-badge";
import { TaskTickButton } from "./task-tick-button";

export function LeaderDashboard({
  data,
  activities,
  userId,
}: {
  data: LeaderDashboardView;
  activities: ActivityEntry[];
  userId: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/65 px-3 py-1 shadow-sm ring-1 ring-sky-100">
          <Calendar className="h-4 w-4 text-sky-600" />
          <span>{formatDateLabel(data.date)}</span>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200/70">
          {SCOPE_LABELS[data.scopeLabel]}
        </span>
      </div>

      <section className="glass-card overflow-hidden">
        <div
          className="space-y-2 px-4 py-5 text-sky-950"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-900/80">
            <TrendingUp className="h-4 w-4" />
            Bảng điều phối hôm nay
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">Giữ nhịp cho cả đội</h1>
              <p className="mt-1 text-sm text-sky-950/76">
                Theo dõi tiến độ nhanh, thấy ngay khu vực nào đang cần kéo lên.
              </p>
            </div>
            <div className="rounded-2xl bg-white/72 px-4 py-3 text-right shadow-lg shadow-sky-500/20 ring-1 ring-white/80">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                Hoàn thành toàn đội
              </p>
              <p className="mt-1 text-2xl font-extrabold">
                {data.highlights.completionPercent}%
              </p>
            </div>
          </div>
        </div>
      </section>

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

      <GoalNoticeBanner notice={data.goalNotice} />

      {data.cards.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Nhiệm vụ hôm nay
          </h2>
          <div className="stagger-children space-y-2">
            {data.cards.map((card) => (
              <div
                key={card.id}
                className={`glass-card flex items-center gap-3 p-4 transition-colors ${
                  card.isApplicableToActor && card.progress.isGoalComplete
                    ? "dashboard-task-goal-complete"
                    : ""
                }`}
              >
                {card.isApplicableToActor ? (
                  <TaskTickButton
                    taskId={card.id}
                    subjectUserId={userId}
                    myCompletionCount={card.myCompletionCount}
                    status={card.status}
                    isGoalComplete={card.progress.isGoalComplete}
                  />
                ) : (
                  <div className="h-9 w-9 shrink-0" aria-hidden />
                )}
                <Link
                  href={`/tasks/${card.id}`}
                  className="card-hover -m-2 flex min-w-0 flex-1 items-center justify-between rounded-xl p-2 active:bg-overlay-medium active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-sm font-semibold"
                      title={card.title}
                    >
                      {card.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5 text-[10px] font-semibold">
                        {TASK_TYPE_LABELS[card.taskType]}
                      </span>
                      {card.isApplicableToActor && (
                        <TaskProgressBadge progress={card.progress} />
                      )}
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
                        <span
                          className="rounded-full px-2 py-0.5 font-semibold"
                          style={{
                            background: "var(--reward-soft)",
                            color: "color-mix(in srgb, var(--reward) 72%, black 28%)",
                          }}
                        >
                          +{card.expReward} XP
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {card.isApplicableToActor && card.myCompletionCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold">
                        {card.myCompletionCount}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </div>
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

      <ActivityFeed activities={activities} />
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
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
        style={{
          background: "color-mix(in srgb, var(--accent) 82%, white 18%)",
          color: "color-mix(in srgb, var(--primary) 72%, black 28%)",
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
