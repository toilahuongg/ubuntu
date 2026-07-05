import { Crown, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type PodiumDesignVariant = "royal" | "medal" | "circuit" | "neon";

export type PodiumItem = {
  id: string;
  rank: number;
  name: ReactNode;
  subtitle: string;
  score: number;
  icon: ReactNode;
  iconLg?: ReactNode;
};

type PodiumRank = 1 | 2 | 3;
type PodiumStyle = {
  stand: string;
  badge: string;
  iconColor: string;
  name: string;
  profile: string;
};

const PODIUM_STYLES = {
  1: {
    stand:
      "h-[104px] border-amber-200 bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 text-amber-950 shadow-amber-200/70",
    badge:
      "border-amber-300 bg-gradient-to-b from-amber-300 to-amber-500 text-white shadow-amber-200/80",
    iconColor: "text-amber-600",
    name: "text-foreground",
    profile: "mb-3",
  },
  2: {
    stand:
      "h-[86px] border-slate-200 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 text-slate-900 shadow-slate-200/70",
    badge:
      "border-slate-200 bg-gradient-to-b from-slate-200 to-slate-400 text-white shadow-slate-200/80",
    iconColor: "text-slate-500",
    name: "text-foreground",
    profile: "mb-2",
  },
  3: {
    stand:
      "h-[64px] border-orange-200 bg-gradient-to-b from-orange-100 via-orange-200 to-orange-300 text-orange-950 shadow-orange-200/70",
    badge:
      "border-orange-200 bg-gradient-to-b from-orange-200 to-orange-500 text-white shadow-orange-200/80",
    iconColor: "text-orange-700",
    name: "text-foreground",
    profile: "mb-2",
  },
} as const;

const NEON_PODIUM_STYLES = {
  1: {
    stand:
      "h-[104px] border-lime-300/60 bg-gradient-to-b from-lime-300 via-lime-400 to-lime-500 text-black shadow-[0_16px_36px_-18px_rgba(50,255,0,0.9)]",
    badge:
      "border-lime-200/70 bg-gradient-to-b from-lime-300 to-lime-500 text-black shadow-[0_10px_30px_-18px_rgba(50,255,0,0.9)]",
    iconColor: "text-lime-200",
    name: "text-lime-50",
    profile: "mb-3",
  },
  2: {
    stand:
      "h-[86px] border-zinc-500 bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-700 text-white shadow-black/50",
    badge:
      "border-zinc-300 bg-gradient-to-b from-zinc-300 to-zinc-600 text-white shadow-black/50",
    iconColor: "text-zinc-100",
    name: "text-white",
    profile: "mb-2",
  },
  3: {
    stand:
      "h-[64px] border-emerald-400/65 bg-gradient-to-b from-emerald-400 to-emerald-700 text-white shadow-emerald-900/50",
    badge:
      "border-emerald-300/80 bg-gradient-to-b from-emerald-300 to-emerald-600 text-white shadow-emerald-900/50",
    iconColor: "text-emerald-100",
    name: "text-lime-50",
    profile: "mb-2",
  },
} as const;

const VARIANT_META = {
  royal: {
    label: "Royal Frame",
    stage:
      "bg-[radial-gradient(circle_at_50%_8%,rgba(251,191,36,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(148,163,184,0.28))] dark:bg-[radial-gradient(circle_at_50%_8%,rgba(251,191,36,0.2),transparent_32%),linear-gradient(180deg,rgba(30,41,59,0.86),rgba(15,23,42,0.66))]",
  },
  medal: {
    label: "Medal Showcase",
    stage:
      "bg-[radial-gradient(circle_at_50%_26%,rgba(56,189,248,0.18),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.5),rgba(226,232,240,0.28))] dark:bg-[radial-gradient(circle_at_50%_26%,rgba(56,189,248,0.2),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(8,22,42,0.68))]",
  },
  circuit: {
    label: "Circuit Podium",
    stage:
      "bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(251,191,36,0.1)_42%,rgba(34,211,238,0.1)),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(203,213,225,0.22))] dark:bg-[linear-gradient(135deg,rgba(14,165,233,0.2),rgba(251,191,36,0.12)_42%,rgba(34,211,238,0.14)),linear-gradient(180deg,rgba(6,20,37,0.92),rgba(8,22,42,0.72))]",
  },
  neon: {
    label: "Neon Leaderboard",
    stage:
      "bg-[radial-gradient(circle_at_16%_0%,rgba(50,255,0,0.26),transparent_35%),radial-gradient(circle_at_85%_100%,rgba(50,255,0,0.18),transparent_40%),linear-gradient(180deg,#242424,#171717)]",
  },
} as const;

export function Podium({
  items,
  variant = "royal",
  unit = "điểm",
}: {
  items: PodiumItem[];
  variant?: PodiumDesignVariant;
  unit?: string;
}) {
  const topThree = items.slice(0, 3).map((item, index) => ({
    ...item,
    podiumRank: (index + 1) as PodiumRank,
  }));
  const rest = items.slice(3);
  const topByRank = new Map(topThree.map((item) => [item.podiumRank, item]));
  const desktopRanks = [2, 1, 3] as const;

  return (
    <div className="px-4 py-5">
      <div className="hidden min-[560px]:block">
        <div
          className={`relative mx-auto h-[356px] max-w-xl overflow-hidden rounded-[26px] border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_18px_48px_-32px_rgba(14,165,233,0.55)] ${VARIANT_META[variant].stage}`}
        >
          <PodiumStageFrame variant={variant} />
          <div className="absolute inset-x-6 bottom-6 z-10 grid grid-cols-3 items-end gap-6">
            {desktopRanks.map((rank) => {
              const item = topByRank.get(rank);
              const style = variant === "neon" ? NEON_PODIUM_STYLES[rank] : PODIUM_STYLES[rank];

              return (
                <div
                  key={rank}
                  className="flex min-w-0 flex-col justify-end text-center"
                >
                  {item ? (
                    <PodiumProfile
                      item={item}
                      podiumRank={rank}
                      style={style}
                      variant={variant}
                    />
                  ) : null}
                  {item ? (
                    <ScoreStand
                      rank={rank}
                      score={item.score}
                      standClass={style.stand}
                      variant={variant}
                      unit={unit}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3 min-[560px]:hidden">
        {topThree.map((item) => (
          <MobilePodiumCard
            key={item.id}
            item={item}
            podiumRank={item.podiumRank}
            variant={variant}
            unit={unit}
          />
        ))}
      </div>

      {rest.length > 0 ? (
        <div className={`mt-4 divide-y ${variant === "neon" ? "divide-lime-300/20" : "divide-border"}`}>
          {rest.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              <RankBadge rank={item.rank} variant={variant} />
              {item.icon}
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${variant === "neon" ? "text-lime-50" : ""}`}>{item.name}</p>
                <p className={`text-[11px] ${variant === "neon" ? "text-lime-100/65" : "text-muted-foreground"}`}>
                  {item.subtitle}
                </p>
              </div>
              <XpValue xp={item.score} variant={variant} unit={unit} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PodiumReviewCard({
  items,
  title,
  icon,
  variant,
  unit,
}: {
  items: PodiumItem[];
  title: string;
  icon: ReactNode;
  variant: PodiumDesignVariant;
  unit?: string;
}) {
  return (
    <section className="glass-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-overlay-subtle px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {VARIANT_META[variant].label}
        </span>
      </header>
      <Podium items={items} variant={variant} unit={unit} />
    </section>
  );
}

function RankBadge({
  rank,
  variant,
}: {
  rank: number;
  variant: PodiumDesignVariant;
}) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        variant === "neon"
          ? "border border-lime-300/35 bg-black/35 text-lime-100"
          : rank <= 3
            ? "bg-overlay-medium text-foreground"
            : "text-muted-foreground"
      }`}
    >
      {rank}
    </span>
  );
}

function XpValue({
  xp,
  variant,
  unit = "điểm",
}: {
  xp: number;
  variant: PodiumDesignVariant;
  unit?: string;
}) {
  return (
    <span className={`text-sm font-bold tabular-nums ${variant === "neon" ? "text-lime-100" : ""}`}>
      {xp.toLocaleString("vi-VN")}
      <span className={`ml-0.5 text-[10px] font-normal ${variant === "neon" ? "text-lime-100/65" : "text-muted-foreground"}`}>
        {unit}
      </span>
    </span>
  );
}

function ScoreStand({
  rank,
  score,
  standClass,
  variant,
  unit = "điểm",
}: {
  rank: PodiumRank;
  score: number;
  standClass: string;
  variant: PodiumDesignVariant;
  unit?: string;
}) {
  return (
    <div
      className={`relative z-10 flex w-full flex-col items-center justify-center overflow-hidden rounded-t-lg border px-3 text-center shadow-lg ${standClass}`}
    >
      <ScoreStandOrnament rank={rank} variant={variant} />
      <div className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/45" />
      <p className="relative text-2xl font-bold tabular-nums leading-none">
        {score.toLocaleString("vi-VN")}
      </p>
      <p className="relative text-sm font-medium opacity-75">{unit}</p>
    </div>
  );
}

function PodiumProfile({
  item,
  podiumRank,
  style,
  variant,
}: {
  item: PodiumItem;
  podiumRank: PodiumRank;
  style: PodiumStyle;
  variant: PodiumDesignVariant;
}) {
  const isFirst = podiumRank === 1;

  return (
    <div className={`relative ${style.profile}`}>
      <TopRankOrnament rank={podiumRank} variant={variant} />
      <div className="mb-1 flex h-7 justify-center">
        {isFirst ? (
          <Crown className="h-7 w-7 fill-amber-300 text-amber-400 drop-shadow-sm" />
        ) : null}
      </div>
      <div className="flex justify-center">
        <span
          className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-base font-bold shadow-md ${style.badge}`}
        >
          {podiumRank}
        </span>
      </div>

      <RankSparkles rank={podiumRank} variant={variant} />

      <div className="mt-3 flex justify-center">
        <div
          className={`relative flex items-center justify-center rounded-full ${style.iconColor} ${
            isFirst
              ? "h-16 w-16 sm:h-20 sm:w-20"
              : "h-14 w-14 sm:h-16 sm:w-16"
          }`}
        >
          <div className="relative z-10">
            {isFirst && item.iconLg ? item.iconLg : item.icon}
          </div>
        </div>
      </div>
      <p className={`mt-2 truncate text-base font-semibold ${style.name}`}>
        {item.name}
      </p>
      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
    </div>
  );
}

function MobilePodiumCard({
  item,
  podiumRank,
  variant,
  unit,
}: {
  item: PodiumItem & { podiumRank: PodiumRank };
  podiumRank: PodiumRank;
  variant: PodiumDesignVariant;
  unit?: string;
}) {
  const style = variant === "neon" ? NEON_PODIUM_STYLES[podiumRank] : PODIUM_STYLES[podiumRank];

  return (
    <article className={`relative overflow-hidden rounded-xl p-3 shadow-sm ${variant === "neon" ? "border border-lime-300/25 bg-black/35" : "border border-border bg-white/82 dark:bg-slate-950/34"}`}>
      <MobileCardOrnament rank={podiumRank} variant={variant} />
      <div className="relative flex items-center gap-3">
        <span
          className={`flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-bold ${style.badge}`}
        >
          #{item.rank}
        </span>
        <div
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${style.iconColor}`}
        >
          <div className="relative z-10">
            {podiumRank === 1 && item.iconLg ? item.iconLg : item.icon}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {item.subtitle}
          </p>
        </div>
        <XpValue xp={item.score} variant={variant} unit={unit} />
      </div>
    </article>
  );
}

function PodiumStageFrame({ variant }: { variant: PodiumDesignVariant }) {
  const skin =
    variant === "neon"
      ? "border-white/10 bg-black/10"
      : "border-white/20 bg-white/[0.06] dark:bg-white/[0.03]";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-2 rounded-[22px] border ${skin}`}
    />
  );
}

function TopRankOrnament({
  rank,
  variant,
}: {
  rank: PodiumRank;
  variant: PodiumDesignVariant;
}) {
  if (rank !== 1 || variant !== "medal") return null;

  return (
    <span className="pointer-events-none absolute left-1/2 top-[62px] h-12 w-36 -translate-x-1/2 rounded-full bg-sky-200/28 blur-xl dark:bg-cyan-300/16" />
  );
}

function RankSparkles({
  rank,
  variant,
}: {
  rank: PodiumRank;
  variant: PodiumDesignVariant;
}) {
  if (rank !== 1) return null;

  const className =
    variant === "circuit"
      ? "text-cyan-200 dark:text-cyan-300"
      : "text-amber-300";

  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-[72px] hidden w-48 -translate-x-1/2 justify-between ${className} min-[640px]:flex`}
    >
      <Sparkles className="h-4 w-4" />
      <Sparkles className="mt-5 h-3 w-3" />
      <Sparkles className="h-4 w-4" />
    </div>
  );
}

function ScoreStandOrnament({
  rank,
  variant,
}: {
  rank: PodiumRank;
  variant: PodiumDesignVariant;
}) {
  if (variant === "medal") {
    return (
      <span className="absolute inset-x-4 bottom-0 h-7 rounded-t-full bg-white/24" />
    );
  }

  if (variant === "circuit") {
    return (
      <>
        <span className="absolute left-3 top-3 h-px w-8 bg-white/45" />
        <span className="absolute right-3 bottom-3 h-px w-8 bg-white/35" />
        <span className="absolute inset-x-0 bottom-0 h-3 bg-cyan-200/16" />
      </>
    );
  }

  if (rank === 1) {
    return <span className="absolute inset-x-0 bottom-0 h-8 bg-amber-400/24" />;
  }

  return null;
}

function MobileCardOrnament({
  rank,
  variant,
}: {
  rank: PodiumRank;
  variant: PodiumDesignVariant;
}) {
  if (variant === "circuit") {
    return (
      <span className="absolute inset-y-3 right-3 w-16 rounded-full border-r border-cyan-200/45 dark:border-cyan-300/20" />
    );
  }

  if (variant === "medal") {
    return (
      <span className="absolute -right-8 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-sky-200/22 dark:bg-cyan-300/10" />
    );
  }

  return rank === 1 ? (
    <span className="absolute -right-8 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-amber-200/28 dark:bg-amber-300/10" />
  ) : null;
}
