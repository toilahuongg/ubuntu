import type { ComponentType } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Flame,
  ShoppingBag,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { PushToggle } from "@/components/push-toggle";
import { getCurrentUser } from "@/lib/current-user";
import { ROLE_LABELS } from "@/lib/domain";
import {
  getUserTaskActivityStats,
  type UserTaskActivityStats,
} from "@/lib/services/analytics-service";
import { getUserProgress } from "@/lib/services/gamification-service";
import { EditProfileForm } from "./edit-profile-form";
import { LogoutButton } from "./logout-button";
import { TaskActivityCalendar } from "./task-activity-calendar";

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
  const isMaxLevel = levelSpan === 0;
  const progressPercent = getProgressPercent(progress);

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-slide-up">
      <section className="glass-card overflow-hidden">
        <div className="flex items-center gap-4 p-4 sm:p-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full">
            <Image
              src={progress.levelInfo.icon}
              alt={progress.levelInfo.nameVi}
              width={68}
              height={68}
              className="rounded-full object-cover"
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
            <p className="mt-2 max-w-[28rem] text-xs leading-5 text-muted-foreground">
              {progress.levelInfo.description}
            </p>

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
                {isMaxLevel
                  ? "Đã đạt cấp tối đa"
                  : `${formatNumber(progress.progressXp)} / ${formatNumber(levelSpan)} XP`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <QuickActionsSection />

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
        <LogoutButton compact />
      </section>
    </div>
  );
}

function QuickActionsSection() {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Truy cập nhanh
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/shop"
          className="group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Cửa hàng
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                Đổi điểm và trang bị vật phẩm.
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>

        <PushToggle compact />
      </div>
    </section>
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
        <TaskActivityCalendar
          rows={stats.rows}
          startDate={stats.startDate}
          endDate={stats.endDate}
        />
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
