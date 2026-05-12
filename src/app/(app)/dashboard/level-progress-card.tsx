import Image from "next/image";
import { BookOpen, CheckCircle2, Trophy, Zap } from "lucide-react";

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
    <section className="glass-card overflow-hidden p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-overlay-subtle ring-1 ring-border">
          <Image
            src={levelIcon}
            alt={levelName}
            width={68}
            height={68}
            priority
            className="shrink-0 rounded-xl object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate font-display text-xl font-bold tracking-tight">
              {user.fullName}
            </h1>
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
              {ROLE_LABELS[user.role]}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-overlay-subtle px-2.5 py-1 ring-1 ring-border">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              Lv.{level} - {levelName}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-overlay-subtle px-2.5 py-1 ring-1 ring-border">
              <Zap className="h-3.5 w-3.5 text-[color:var(--reward)]" />
              {totalXp.toLocaleString("vi-VN")} XP
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-overlay-subtle px-2.5 py-1 ring-1 ring-border">
              <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--success)]" />
              {completedCount} xong, {pendingCount} còn lại
            </span>
          </div>

          <p className="mt-2 max-w-[28rem] text-xs leading-5 text-muted-foreground">
            {levelDescription}
          </p>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>Tiến độ lên cấp</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-overlay-medium ring-1 ring-border">
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

      <div className="mt-4 rounded-2xl border border-border bg-overlay-subtle p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
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
