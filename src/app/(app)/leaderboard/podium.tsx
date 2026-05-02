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
  avatarRing: string;
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
    avatarRing:
      "border-amber-200 bg-amber-50 shadow-[0_0_30px_rgba(251,191,36,0.28)]",
    iconColor: "text-amber-600",
    name: "text-foreground",
    profile: "mb-3",
  },
  2: {
    stand:
      "h-[86px] border-slate-200 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 text-slate-900 shadow-slate-200/70",
    badge:
      "border-slate-200 bg-gradient-to-b from-slate-200 to-slate-400 text-white shadow-slate-200/80",
    avatarRing: "border-slate-200 bg-slate-50",
    iconColor: "text-slate-500",
    name: "text-foreground",
    profile: "mb-2",
  },
  3: {
    stand:
      "h-[64px] border-orange-200 bg-gradient-to-b from-orange-100 via-orange-200 to-orange-300 text-orange-950 shadow-orange-200/70",
    badge:
      "border-orange-200 bg-gradient-to-b from-orange-200 to-orange-500 text-white shadow-orange-200/80",
    avatarRing: "border-orange-200 bg-orange-50",
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
    avatarRing:
      "border-lime-300/60 bg-lime-100/10 shadow-[0_0_30px_rgba(50,255,0,0.34)]",
    iconColor: "text-lime-200",
    name: "text-lime-50",
    profile: "mb-3",
  },
  2: {
    stand:
      "h-[86px] border-zinc-500 bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-700 text-white shadow-black/50",
    badge:
      "border-zinc-300 bg-gradient-to-b from-zinc-300 to-zinc-600 text-white shadow-black/50",
    avatarRing: "border-zinc-500 bg-zinc-200/10",
    iconColor: "text-zinc-100",
    name: "text-white",
    profile: "mb-2",
  },
  3: {
    stand:
      "h-[64px] border-emerald-400/65 bg-gradient-to-b from-emerald-400 to-emerald-700 text-white shadow-emerald-900/50",
    badge:
      "border-emerald-300/80 bg-gradient-to-b from-emerald-300 to-emerald-600 text-white shadow-emerald-900/50",
    avatarRing: "border-emerald-400/60 bg-emerald-100/10",
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
}: {
  items: PodiumItem[];
  variant?: PodiumDesignVariant;
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
              <XpValue xp={item.score} variant={variant} />
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
}: {
  items: PodiumItem[];
  title: string;
  icon: ReactNode;
  variant: PodiumDesignVariant;
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
      <Podium items={items} variant={variant} />
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
}: {
  xp: number;
  variant: PodiumDesignVariant;
}) {
  return (
    <span className={`text-sm font-bold tabular-nums ${variant === "neon" ? "text-lime-100" : ""}`}>
      {xp.toLocaleString("vi-VN")}
      <span className={`ml-0.5 text-[10px] font-normal ${variant === "neon" ? "text-lime-100/65" : "text-muted-foreground"}`}>
        điểm
      </span>
    </span>
  );
}

function ScoreStand({
  rank,
  score,
  standClass,
  variant,
}: {
  rank: PodiumRank;
  score: number;
  standClass: string;
  variant: PodiumDesignVariant;
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
      <p className="relative text-sm font-medium opacity-75">điểm</p>
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
          className={`relative flex items-center justify-center rounded-full border shadow-sm ${style.avatarRing} ${style.iconColor} ${
            isFirst
              ? "h-28 w-28 p-3 sm:h-32 sm:w-32"
              : "h-24 w-24 p-2 sm:h-[104px] sm:w-[104px]"
          }`}
        >
          <AvatarRankFrame
            rank={podiumRank}
            variant={variant}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
          <AvatarSideOrnaments rank={podiumRank} variant={variant} />
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
}: {
  item: PodiumItem & { podiumRank: PodiumRank };
  podiumRank: PodiumRank;
  variant: PodiumDesignVariant;
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
          className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border p-1 ${style.avatarRing} ${style.iconColor}`}
        >
          <AvatarRankFrame
            rank={podiumRank}
            variant={variant}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
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
        <XpValue xp={item.score} variant={variant} />
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

function AvatarSideOrnaments({
  rank,
  variant,
}: {
  rank: PodiumRank;
  variant: PodiumDesignVariant;
}) {
  if (variant === "royal" && rank === 1) {
    return (
      <>
        <span className="absolute -left-8 top-7 h-16 w-5 rounded-full border-l-4 border-amber-300/80" />
        <span className="absolute -right-8 top-7 h-16 w-5 rounded-full border-r-4 border-amber-300/80" />
      </>
    );
  }

  if (variant === "medal") {
    return (
      <span className="absolute -bottom-1 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full border border-sky-200/60 bg-sky-100/40 dark:border-cyan-300/20 dark:bg-cyan-300/10" />
    );
  }

  if (variant === "circuit") {
    return (
      <>
        <span className="absolute -left-4 top-1/2 h-px w-5 bg-cyan-200/80 dark:bg-cyan-300/35" />
        <span className="absolute -right-4 top-1/2 h-px w-5 bg-cyan-200/80 dark:bg-cyan-300/35" />
        <span className="absolute -top-3 left-1/2 h-4 w-px -translate-x-1/2 bg-amber-200/80 dark:bg-amber-300/35" />
      </>
    );
  }

  return null;
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

function AvatarRankFrame({
  rank,
  variant,
  className,
}: {
  rank: PodiumRank;
  variant: PodiumDesignVariant;
  className?: string;
}) {
  const palette = getAvatarPalette(rank, variant);

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 128 128"
      fill="none"
    >
      <circle cx="64" cy="64" r="56" fill={palette.glow} opacity="0.34" />
      <circle
        cx="64"
        cy="64"
        r="48"
        stroke={palette.outer}
        strokeWidth={variant === "royal" && rank === 1 ? 6 : 5}
      />
      <circle
        cx="64"
        cy="64"
        r="42"
        stroke={palette.inner}
        strokeOpacity="0.82"
        strokeWidth="1.5"
      />
      {variant === "royal" && rank === 1 ? (
        <>
          <path
            d="M21 72C23 62 26 56 31 53"
            stroke="#FCD34D"
            strokeLinecap="round"
            strokeWidth="3.2"
          />
          <path
            d="M31 53C27 53 23 55.5 20.5 59.5"
            stroke="#FDE68A"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
          <path
            d="M107 72C105 62 102 56 97 53"
            stroke="#FCD34D"
            strokeLinecap="round"
            strokeWidth="3.2"
          />
          <path
            d="M97 53C101 53 105 55.5 107.5 59.5"
            stroke="#FDE68A"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
          <path
            d="M49 18L56 27L64 20L72 27L79 18L75 34H53L49 18Z"
            fill="#FACC15"
            stroke="#F59E0B"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
        </>
      ) : null}
      {variant === "medal" ? (
        <path
          d="M42 21H86L78 38H50L42 21Z"
          fill={palette.inner}
          opacity="0.56"
        />
      ) : null}
      {variant === "circuit" ? (
        <>
          <path
            d="M28 64H12M116 64H100M64 28V12M64 116V100"
            stroke={palette.inner}
            strokeLinecap="round"
            strokeWidth="2.4"
          />
          <circle cx="64" cy="12" r="2.5" fill={palette.outer} />
          <circle cx="116" cy="64" r="2.5" fill={palette.outer} />
        </>
      ) : null}
    </svg>
  );
}

function getAvatarPalette(rank: PodiumRank, variant: PodiumDesignVariant) {
  if (variant === "circuit") {
    return rank === 1
      ? { glow: "#FDE68A", outer: "#FBBF24", inner: "#67E8F9" }
      : rank === 2
        ? { glow: "#7DD3FC", outer: "#38BDF8", inner: "#E0F2FE" }
        : { glow: "#FDBA74", outer: "#FB923C", inner: "#BAE6FD" };
  }

  if (variant === "medal") {
    return rank === 1
      ? { glow: "#FDE68A", outer: "#F59E0B", inner: "#FEF3C7" }
      : rank === 2
        ? { glow: "#E2E8F0", outer: "#94A3B8", inner: "#F8FAFC" }
        : { glow: "#FDBA74", outer: "#EA580C", inner: "#FFEDD5" };
  }

  return rank === 1
    ? { glow: "#FDE68A", outer: "#FBBF24", inner: "#FEF3C7" }
    : rank === 2
      ? { glow: "#E2E8F0", outer: "#CBD5E1", inner: "#FFFFFF" }
      : { glow: "#FDBA74", outer: "#FB923C", inner: "#FFEDD5" };
}
