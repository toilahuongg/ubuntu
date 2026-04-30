import Image from "@/components/compat/image";

import type { DailyScripture } from "@/lib/daily-scripture";

type LevelProgressCardProps = {
  completedCount: number;
  dailyScripture: DailyScripture;
  level: number;
  levelIcon: string;
  levelName: string;
  nextLevelXp: number;
  pendingCount: number;
  progressPercent: number;
  progressXp: number;
  totalXp: number;
};

export function LevelProgressCard({
  completedCount,
  dailyScripture,
  level,
  levelIcon,
  levelName,
  nextLevelXp,
  pendingCount,
  progressPercent,
  progressXp,
  totalXp,
}: LevelProgressCardProps) {
  return (
    <section className="glass-card overflow-hidden">
      <div
        className="flex items-start gap-4 px-4 py-5"
        style={{
          background: "var(--gradient-primary)",
          color: "var(--gradient-foreground)",
        }}
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-card/75 shadow-lg shadow-sky-500/20 ring-1 ring-border">
          <Image
            src={levelIcon}
            alt={levelName}
            width={56}
            height={56}
            className="shrink-0 drop-shadow-sm"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-2xl font-extrabold leading-none">Lv.{level}</p>
            <span className="rounded-full bg-card/75 px-2.5 py-1 text-[11px] font-semibold text-card-foreground shadow-sm ring-1 ring-border">
              {levelName}
            </span>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-card/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-card-foreground/85 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              Lời hôm nay
            </span>
            <blockquote
              className="scripture-preview min-h-[4.5rem] text-sm font-medium leading-6"
              style={{ color: "var(--gradient-muted-foreground)" }}
              title={`${dailyScripture.reference}: ${dailyScripture.fullText}`}
            >
              &ldquo;{dailyScripture.previewText}&rdquo;
            </blockquote>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--gradient-foreground)" }}
            >
              {dailyScripture.reference}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary ring-1 ring-primary/20">
            {completedCount} đã xong
          </span>
          <span className="rounded-full bg-overlay-subtle px-3 py-1 text-muted-foreground ring-1 ring-border">
            {pendingCount} còn lại
          </span>
          <span
            className="rounded-full px-3 py-1 ring-1"
            style={{
              background: "var(--reward-soft)",
              borderColor: "color-mix(in srgb, var(--reward) 28%, transparent)",
              color: "color-mix(in srgb, var(--reward) 82%, var(--foreground) 18%)",
            }}
          >
            Tổng {totalXp.toLocaleString("vi-VN")} XP
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Tiến độ lên cấp</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-overlay-medium ring-1 ring-border">
            <div
              className="progress-glow h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background: "var(--gradient-primary)",
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {progressXp.toLocaleString("vi-VN")} /{" "}
            {nextLevelXp.toLocaleString("vi-VN")} XP cho cấp kế tiếp
          </p>
        </div>
      </div>
    </section>
  );
}
