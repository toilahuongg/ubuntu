import type { ComponentType, CSSProperties } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CalendarDays, Check, Flame, Plus, ShoppingBag, Target, Trophy, Zap } from "lucide-react";
import Link from "next/link";

import { PushToggle } from "@/components/push-toggle";
import { getCurrentUser } from "@/lib/current-user";
import { ROLE_LABELS } from "@/lib/domain";
import {
  getUserTaskActivityStats,
  type TaskActivityRow,
  type UserTaskActivityStats,
} from "@/lib/services/analytics-service";
import { getUserProgress } from "@/lib/services/gamification-service";
import { EditProfileForm } from "./edit-profile-form";
import { LogoutButton } from "./logout-button";

const STAT_ACCENTS = ["#34d399", "#c084fc", "#fb7185", "#fb923c", "#22d3ee"];

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function formatShortDate(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

function getProgressPercent(input: {
  currentLevelXp: number;
  nextLevelXp: number;
  progressXp: number;
}) {
  const levelSpan = input.nextLevelXp - input.currentLevelXp;
  if (levelSpan <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((input.progressXp / levelSpan) * 100)));
}

export default async function ProfilePage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const [progress, activityStats] = await Promise.all([
    getUserProgress(session.id),
    getUserTaskActivityStats(session, 30),
  ]);

  const levelSpan = Math.max(progress.nextLevelXp - progress.currentLevelXp, 0);
  const progressPercent = getProgressPercent(progress);

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-slide-up">
      <section className="glass-card overflow-hidden">
        <div className="flex items-center gap-4 p-4 sm:p-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-overlay-medium ring-1 ring-border">
            <Image
              src={progress.levelInfo.icon}
              alt={progress.levelInfo.nameVi}
              width={68}
              height={68}
              className="drop-shadow-md"
              priority
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-xl font-bold tracking-tight">
                {session.fullName}
              </h1>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                {ROLE_LABELS[session.role]}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-overlay-subtle px-2.5 py-1 ring-1 ring-border">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                Lv.{progress.level} - {progress.levelInfo.nameVi}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-overlay-subtle px-2.5 py-1 ring-1 ring-border">
                <Zap className="h-3.5 w-3.5 text-[color:var(--reward)]" />
                {formatNumber(progress.totalXp)} XP
              </span>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>Tiến độ lên cấp</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-overlay-medium ring-1 ring-border">
                <div
                  className="progress-glow h-full rounded-full transition-all duration-500"
                  style={{
                    background: "var(--gradient-primary)",
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formatNumber(progress.progressXp)} / {formatNumber(levelSpan)} XP
              </p>
            </div>
          </div>
        </div>
      </section>

      <TaskStatsSection stats={activityStats} />

      <section className="glass-card space-y-3 p-3">
        <div className="px-1">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tài khoản
          </h2>
        </div>
        <EditProfileForm
          initialFullName={session.fullName}
          initialGender={(session.gender ?? "male") as "male" | "female"}
          initialBio={session.bio ?? ""}
          level={progress.level}
          compact
        />
        <Link
          href="/shop"
          className="flex items-center gap-3 rounded-xl bg-overlay-subtle px-4 py-3 text-sm font-medium ring-1 ring-border transition hover:bg-overlay-medium"
        >
          <ShoppingBag className="h-4 w-4 text-primary" />
          Cửa hàng
        </Link>
        <PushToggle compact />
        <LogoutButton compact />
      </section>
    </div>
  );
}

function TaskStatsSection({ stats }: { stats: UserTaskActivityStats }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Thống kê 30 ngày
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatShortDate(stats.startDate)} - {formatShortDate(stats.endDate)}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <StatsPill
            icon={Target}
            label={`${formatNumber(stats.totalCompletions)} lượt`}
          />
          <StatsPill
            icon={CalendarDays}
            label={`${stats.completedDays}/${stats.days} ngày`}
          />
          <StatsPill icon={Flame} label={`${stats.currentStreak} streak`} />
        </div>
      </div>

      {stats.rows.length > 0 ? (
        <div className="space-y-3">
          {stats.rows.map((row, index) => (
            <TaskActivityRowCard key={row.id} row={row} index={index} />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center px-5 py-10 text-center">
          <Target className="mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="text-sm font-medium">Chưa có nhiệm vụ để thống kê.</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Khi bạn có nhiệm vụ đang áp dụng, lịch sử hoàn thành 30 ngày sẽ xuất
            hiện ở đây.
          </p>
        </div>
      )}
    </section>
  );
}

function StatsPill({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-overlay-subtle px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </span>
  );
}

function TaskActivityRowCard({
  index,
  row,
}: {
  index: number;
  row: TaskActivityRow;
}) {
  const accent = STAT_ACCENTS[index % STAT_ACCENTS.length];
  const style = { "--profile-stat-accent": accent } as CSSProperties;

  return (
    <article
      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-3 text-slate-50 shadow-[0_16px_36px_-28px_rgba(2,6,23,0.9)]"
      style={style}
    >
      <div className="mb-3 flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-slate-950"
          style={{ backgroundColor: "var(--profile-stat-accent)" }}
          aria-hidden
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold" title={row.title}>
            {row.title}
          </h3>
          <p
            className="mt-0.5 line-clamp-1 text-xs text-slate-300"
            title={row.description || `${row.completedDays} ngày hoàn thành`}
          >
            {row.description || `${row.completedDays} ngày hoàn thành`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-300">
            <span className="rounded-full bg-white/10 px-2 py-0.5">
              {formatNumber(row.totalCompletions)} lượt
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5">
              {row.currentStreak} streak
            </span>
          </div>
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10"
          style={{
            backgroundColor:
              row.todayCompletionCount > 0
                ? "var(--profile-stat-accent)"
                : "rgba(255, 255, 255, 0.08)",
            color: row.todayCompletionCount > 0 ? "#020617" : "#f8fafc",
          }}
          title={
            row.todayCompletionCount > 0
              ? `Hôm nay: ${row.todayCompletionCount} lượt`
              : "Hôm nay chưa hoàn thành"
          }
          aria-label={
            row.todayCompletionCount > 0
              ? `Hôm nay đã hoàn thành ${row.todayCompletionCount} lượt`
              : "Hôm nay chưa hoàn thành"
          }
        >
          {row.todayCompletionCount > 0 ? (
            <Check className="h-6 w-6 stroke-[3]" />
          ) : (
            <Plus className="h-6 w-6 stroke-[2.5]" />
          )}
        </div>
      </div>

      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
      >
        {row.cells.map((cell) => (
          <span
            key={cell.date}
            className="block aspect-square min-w-0 rounded-[3px] ring-1 ring-white/5"
            style={{
              backgroundColor:
                cell.completionCount > 0
                  ? "var(--profile-stat-accent)"
                  : cell.scheduled
                    ? "color-mix(in srgb, var(--profile-stat-accent) 24%, transparent)"
                    : "rgba(255, 255, 255, 0.07)",
              opacity: cell.scheduled || cell.completionCount > 0 ? 1 : 0.55,
            }}
            title={`${formatShortDate(cell.date)}: ${
              cell.completionCount > 0
                ? `${cell.completionCount} lượt`
                : cell.scheduled
                  ? "chưa hoàn thành"
                  : "không có lịch"
            }`}
            aria-label={`${formatShortDate(cell.date)} ${
              cell.completionCount > 0
                ? `${cell.completionCount} lượt`
                : cell.scheduled
                  ? "chưa hoàn thành"
                  : "không có lịch"
            }`}
          />
        ))}
      </div>
    </article>
  );
}
