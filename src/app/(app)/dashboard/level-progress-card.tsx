import { BookOpen, CheckCircle2, Trophy, Zap } from "lucide-react";

import { VersionedImage as Image } from "@/components/VersionedImage";
import type { DailyScripture } from "@/lib/daily-scripture";
import type { Role } from "@/lib/domain";
import { ROLE_LABELS } from "@/lib/domain";

type LevelProgressCardProps = {
  completedCount: number;
  dailyScripture: DailyScripture;
  level: number;
  levelDescription: string;
  levelIcon: string;
  levelName: string;
  nextLevelXp: number;
  pendingCount: number;
  totalXp: number;
  user: {
    fullName: string;
    role: Role;
  };
};

export function LevelProgressCard({
  completedCount,
  dailyScripture,
  level,
  levelDescription,
  levelIcon,
  levelName,
  nextLevelXp,
  pendingCount,
  totalXp,
  user,
}: LevelProgressCardProps) {
  const isMaxLevel = totalXp >= nextLevelXp;
  const progressPercent =
    nextLevelXp > 0
      ? Math.min(100, Math.max(0, Math.round((totalXp / nextLevelXp) * 100)))
      : 100;
  const levelProgressLabel = isMaxLevel
    ? "Đã đạt cấp tối đa"
    : `${totalXp.toLocaleString("vi-VN")} / ${nextLevelXp.toLocaleString("vi-VN")} XP`;

  return (
    <section className="glass-card overflow-hidden border-0 p-4 sm:p-6">
      <div className="flex flex-col gap-4 min-[430px]:flex-row min-[430px]:items-start min-[430px]:gap-5">
        <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-2xl bg-overlay-subtle min-[430px]:h-24 min-[430px]:w-24 sm:h-28 sm:w-28">
          <Image
            src={levelIcon}
            alt={levelName}
            width={96}
            height={96}
            priority
            className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover min-[430px]:h-20 min-[430px]:w-20 sm:h-24 sm:w-24"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate font-display text-xl font-bold tracking-tight sm:text-2xl">
              {user.fullName}
            </h1>
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {ROLE_LABELS[user.role]}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground min-[360px]:grid-cols-2 min-[560px]:flex min-[560px]:flex-wrap">
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-overlay-subtle px-3 py-1.5">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="min-w-0 truncate">
                Lv.{level} - {levelName}
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-overlay-subtle px-3 py-1.5">
              <Zap className="h-4 w-4 text-[color:var(--reward)]" />
              <span className="min-w-0 truncate">
                {totalXp.toLocaleString("vi-VN")} XP
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-overlay-subtle px-3 py-1.5 min-[360px]:col-span-2 min-[560px]:col-span-1">
              <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />
              <span className="min-w-0 truncate">
                {completedCount} xong, {pendingCount} còn lại
              </span>
            </span>
          </div>

          <p className="mt-3 max-w-[30rem] text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
            {levelDescription}
          </p>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>Tiến độ lên cấp</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-overlay-medium">
              <div
                className="progress-glow h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: "var(--gradient-primary)",
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {levelProgressLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-overlay-subtle p-3 sm:mt-5 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            Lời hôm nay
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
            {dailyScripture.reference}
          </span>
        </div>
        <blockquote
          className="scripture-preview text-sm font-medium leading-6 text-muted-foreground"
          title={`${dailyScripture.reference}: ${dailyScripture.fullText}`}
        >
          &ldquo;{dailyScripture.previewText}&rdquo;
        </blockquote>
      </div>
    </section>
  );
}
