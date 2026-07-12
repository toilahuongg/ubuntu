import type { ComponentType } from "react";
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

import { LevelAvatar } from "@/components/level-avatar";
import { PushToggle } from "@/components/push-toggle";
import { getCurrentUser } from "@/lib/current-user";
import { ROLE_LABELS } from "@/lib/domain";
import {
  getUserTaskActivityStats,
  type UserTaskActivityStats,
} from "@/lib/services/analytics-service";
import { getUserProgress } from "@/lib/services/gamification-service";
import {
  listProfileTaskSettings,
  type ProfileTaskSetting,
} from "@/lib/tasks/profile-settings-service";
import { ChangePasswordForm } from "./change-password-form";
import { EditProfileForm } from "./edit-profile-form";
import { LogoutButton } from "./logout-button";
import { ProfileTaskSettingsShortcut } from "./profile-task-settings-shortcut";
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

  const [progress, activityStats, taskSettings] = await Promise.all([
    getUserProgress(session.id),
    getUserTaskActivityStats(session, 30),
    listProfileTaskSettings(session),
  ]);

  const levelSpan = Math.max(progress.nextLevelXp - progress.currentLevelXp, 0);
  const isMaxLevel = levelSpan === 0;
  const progressPercent = getProgressPercent(progress);

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-slide-up">
      <section className="glass-card overflow-hidden border-0">
        <div className="flex flex-col gap-4 p-4 min-[430px]:flex-row min-[430px]:items-start min-[430px]:gap-5 sm:p-6">
          <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-2xl bg-overlay-subtle min-[430px]:h-24 min-[430px]:w-24 sm:h-28 sm:w-28">
            <LevelAvatar
              src={progress.levelInfo.icon}
              alt={progress.levelInfo.nameVi}
              equipped={progress.equipped}
              size={96}
              className="h-[72px] w-[72px] rounded-xl object-cover min-[430px]:h-20 min-[430px]:w-20 sm:h-24 sm:w-24"
              imageClassName="rounded-xl"
              priority
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 truncate font-display text-xl font-bold tracking-tight sm:text-2xl">
                {session.fullName}
              </h1>
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {ROLE_LABELS[session.role]}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground min-[360px]:grid-cols-2 min-[560px]:flex min-[560px]:flex-wrap">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-overlay-subtle px-3 py-1.5">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="min-w-0 truncate">
                  Lv.{progress.level} - {progress.levelInfo.nameVi}
                </span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-overlay-subtle px-3 py-1.5">
                <Zap className="h-4 w-4 text-[color:var(--reward)]" />
                <span className="min-w-0 truncate">
                  {formatNumber(progress.totalXp)} XP
                </span>
              </span>
            </div>
            <p className="mt-3 max-w-[30rem] text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              {progress.levelInfo.description}
            </p>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>Tiến độ lên cấp</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-overlay-medium">
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

      <QuickActionsSection taskSettings={taskSettings} />

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
        <ChangePasswordForm compact />
        <LogoutButton compact />
      </section>
    </div>
  );
}

function QuickActionsSection({
  taskSettings,
}: {
  taskSettings: ProfileTaskSetting[];
}) {
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

        <ProfileTaskSettingsShortcut settings={taskSettings} />

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
