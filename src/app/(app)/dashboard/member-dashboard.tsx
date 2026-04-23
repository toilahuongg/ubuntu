import Image from "next/image";
import Link from "next/link";
import { Calendar, CheckCircle2, ChevronRight, Clock } from "lucide-react";

import { formatDateLabel } from "@/lib/dates";
import type { ActivityEntry } from "@/lib/tasks/activity-service";
import { TASK_TYPE_LABELS } from "@/lib/tasks/constants";
import type { MemberDashboardView } from "@/lib/tasks/types";
import { ActivityFeed } from "./activity-feed";
import { GoalNoticeBanner } from "./goal-notice-banner";
import { TaskProgressBadge } from "./task-progress-badge";
import { TaskTickButton } from "./task-tick-button";

export function MemberDashboard({
  data,
  activities,
  userId,
}: {
  data: MemberDashboardView;
  activities: ActivityEntry[];
  userId: string;
}) {
  const progressPercent =
    data.nextLevelXp > 0
      ? Math.min(
          100,
          Math.round((data.progressXp / data.nextLevelXp) * 100),
        )
      : 0;
  const completedCount = data.cards.filter((card) => card.myCompletionCount > 0).length;
  const pendingCount = Math.max(data.cards.length - completedCount, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/65 px-3 py-1 shadow-sm ring-1 ring-sky-100">
          <Calendar className="h-4 w-4 text-sky-600" />
          <span>{formatDateLabel(data.date)}</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200/80">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          {data.cards.length} nhiệm vụ hôm nay
        </div>
      </div>

      <section className="glass-card overflow-hidden">
        <div
          className="flex items-center gap-4 px-4 py-5 text-sky-950"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/72 shadow-lg shadow-sky-500/20 ring-1 ring-white/80">
            <Image
              src={data.levelIcon}
              alt={data.levelName}
              width={56}
              height={56}
              className="shrink-0 drop-shadow-sm"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-extrabold leading-none">Lv.{data.level}</p>
              <span className="rounded-full bg-white/72 px-2.5 py-1 text-[11px] font-semibold text-sky-800 shadow-sm">
                {data.levelName}
              </span>
            </div>
            <p className="mt-1 text-sm text-sky-950/78">
              Mỗi lần hoàn thành xong việc, thanh này phải nhích lên thấy rõ.
            </p>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
              {completedCount} đã xong
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-sky-100">
              {pendingCount} còn lại
            </span>
            <span className="rounded-full px-3 py-1 ring-1 ring-rose-200/80" style={{ color: "color-mix(in srgb, var(--reward) 74%, black 26%)", background: "var(--reward-soft)" }}>
              Tổng {data.totalXp.toLocaleString("vi-VN")} XP
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Tiến độ lên cấp</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-sky-100/80 ring-1 ring-sky-200/70">
              <div
                className="progress-glow h-full rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                  background: "var(--gradient-primary)",
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {data.progressXp.toLocaleString("vi-VN")} /{" "}
              {data.nextLevelXp.toLocaleString("vi-VN")} XP cho cấp kế tiếp
            </p>
          </div>
        </div>
      </section>

      <GoalNoticeBanner notice={data.goalNotice} />

      {data.cards.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Nhiệm vụ hôm nay
          </h2>
          <div className="stagger-children space-y-2">
            {data.cards.map((card) => (
              <div
                key={card.id}
                className={`glass-card flex items-center gap-3 p-4 transition-colors ${
                  card.progress.isGoalComplete
                    ? "dashboard-task-goal-complete"
                    : ""
                }`}
              >
                <TaskTickButton
                  taskId={card.id}
                  subjectUserId={userId}
                  myCompletionCount={card.myCompletionCount}
                  status={card.status}
                  isGoalComplete={card.progress.isGoalComplete}
                />
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
                      <TaskProgressBadge progress={card.progress} />
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
                      {card.myCompletionCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Đã nộp
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="ml-3 h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : (
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
