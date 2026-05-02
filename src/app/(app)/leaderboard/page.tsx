import { redirect } from "next/navigation";
import Image from "next/image";
import { Crown, MapPin, Sparkles, Trophy, Users } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import {
  getLeaderboardMonthLabel,
  getTopMembers,
  getTopNgv,
  getTopRegionalLeads,
  getTopRegions,
  getTopTdm,
  type RegionLeaderboardEntry,
} from "@/lib/services/leaderboard-service";
import type { LeaderboardEntry } from "@/lib/services/gamification-service";
import { CosmeticName } from "@/components/cosmetic-name";

export default async function LeaderboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [topRegions, topMembers, topNgv, topTdm, topLeads] = await Promise.all([
    getTopRegions(3),
    getTopMembers(5),
    getTopNgv(5),
    getTopTdm(5),
    getTopRegionalLeads(3),
  ]);

  const monthLabel = getLeaderboardMonthLabel();

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-xl font-bold">Bảng Xếp Hạng</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Tháng {monthLabel} — tính từ ngày 1 hàng tháng
        </p>
      </div>

      <Section title="Top Khu vực" icon={<MapPin className="h-4 w-4" />}>
        {topRegions.length === 0 ? (
          <EmptyRow />
        ) : (
          <RegionPodium regions={topRegions} />
        )}
      </Section>

      <Section title="Top TĐM" icon={<Users className="h-4 w-4" />}>
        {topTdm.length === 0 ? (
          <EmptyRow />
        ) : (
          <UserPodium entries={topTdm} selfId={session.id} />
        )}
      </Section>

      <Section title="Top TĐ" icon={<Users className="h-4 w-4" />}>
        {topMembers.length === 0 ? (
          <EmptyRow />
        ) : (
          <UserPodium entries={topMembers} selfId={session.id} />
        )}
      </Section>

      <Section title="Top NTĐ" icon={<Users className="h-4 w-4" />}>
        {topNgv.length === 0 ? (
          <EmptyRow />
        ) : (
          <UserPodium entries={topNgv} selfId={session.id} />
        )}
      </Section>

      <Section title="Top KVT" icon={<Crown className="h-4 w-4" />}>
        {topLeads.length === 0 ? (
          <EmptyRow />
        ) : (
          <UserPodium entries={topLeads} selfId={session.id} />
        )}
      </Section>
    </div>
  );
}

function Section({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="glass-card overflow-hidden">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 min-[375px]:px-4 min-[375px]:py-3">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        rank <= 3
          ? "bg-overlay-medium text-foreground"
          : "text-muted-foreground"
      }`}
    >
      {rank}
    </span>
  );
}

function XpValue({ xp }: { xp: number }) {
  return (
    <span className="text-sm font-bold tabular-nums">
      {xp.toLocaleString("vi-VN")}
      <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
        điểm
      </span>
    </span>
  );
}

function regionToPodiumItem(region: RegionLeaderboardEntry): PodiumItem {
  return {
    id: region.id,
    rank: region.rank,
    name: region.name,
    subtitle: `${region.code} — ${region.memberCount} thành viên`,
    score: region.totalXp,
    icon: <Trophy className="h-7 w-7 text-current" />,
    iconLg: <Trophy className="h-9 w-9 text-current" />,
  };
}

function userToPodiumItem(
  entry: LeaderboardEntry,
  isSelf: boolean,
): PodiumItem {
  return {
    id: entry.id,
    rank: entry.rank,
    name: (
      <>
        <CosmeticName fullName={entry.fullName} equipped={entry.equipped} />
        {isSelf && (
          <span className="ml-1 text-xs text-muted-foreground">(bạn)</span>
        )}
      </>
    ),
    subtitle: `Lv.${entry.level} — ${entry.levelInfo.nameVi}`,
    score: entry.totalXp,
    icon: (
      <Image
        src={entry.levelInfo.icon}
        alt={entry.levelInfo.nameVi}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    ),
    iconLg: (
      <Image
        src={entry.levelInfo.icon}
        alt={entry.levelInfo.nameVi}
        width={64}
        height={64}
        className="h-14 w-14 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
      />
    ),
  };
}

function RegionPodium({ regions }: { regions: RegionLeaderboardEntry[] }) {
  return <Podium items={regions.map(regionToPodiumItem)} />;
}

function UserPodium({
  entries,
  selfId,
}: {
  entries: LeaderboardEntry[];
  selfId: string;
}) {
  return (
    <Podium
      items={entries.map((entry) =>
        userToPodiumItem(entry, entry.id === selfId),
      )}
    />
  );
}

type PodiumItem = {
  id: string;
  rank: number;
  name: React.ReactNode;
  subtitle: string;
  score: number;
  icon: React.ReactNode;
  iconLg?: React.ReactNode;
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

function Podium({ items }: { items: PodiumItem[] }) {
  const topThree = items.slice(0, 3).map((item, index) => ({
    ...item,
    podiumRank: (index + 1) as 1 | 2 | 3,
  }));
  const rest = items.slice(3);
  const topByRank = new Map(topThree.map((item) => [item.podiumRank, item]));
  const desktopRanks = [2, 1, 3] as const;

  return (
    <div className="py-4 min-[375px]:py-5">
      <div className="hidden min-[375px]:block">
        <div className="relative mx-auto h-[300px] max-w-xl">
          <div className="absolute inset-x-6 bottom-6 z-10 grid grid-cols-3 items-end gap-6">
            {desktopRanks.map((rank) => {
              const item = topByRank.get(rank);
              const style = PODIUM_STYLES[rank];

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
                    />
                  ) : null}
                  {item ? (
                    <div
                      className={`relative z-10 flex w-full flex-col items-center justify-center rounded-t-lg border px-3 text-center shadow-lg ${style.stand}`}
                    >
                      <div className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/45" />
                      <p className="text-xl font-bold tabular-nums leading-none min-[375px]:text-2xl">
                        {item.score.toLocaleString("vi-VN")}
                      </p>
                      <p className="text-xs font-medium opacity-75 min-[375px]:text-sm">
                        điểm
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 px-2 min-[375px]:hidden">
        {topThree.map((item) => {
          const style = PODIUM_STYLES[item.podiumRank];

          return (
            <article
              key={item.id}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2.5 shadow-sm"
            >
              <span
                className={`flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-bold ${style.badge}`}
              >
                #{item.rank}
              </span>
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center ${style.iconColor}`}
              >
                {item.podiumRank === 1 && item.iconLg ? item.iconLg : item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-card-foreground">
                  {item.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.subtitle}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums text-card-foreground">
                {item.score.toLocaleString("vi-VN")}
                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                  điểm
                </span>
              </span>
            </article>
          );
        })}
      </div>

      {rest.length > 0 ? (
        <div className="mt-4 divide-y divide-border">
          {rest.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              <RankBadge rank={item.rank} />
              {item.icon}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium min-[376px]:max-[559px]:text-xs">
                  {item.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {item.subtitle}
                </p>
              </div>
              <XpValue xp={item.score} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PodiumProfile({
  item,
  podiumRank,
  style,
}: {
  item: PodiumItem;
  podiumRank: 1 | 2 | 3;
  style: (typeof PODIUM_STYLES)[1 | 2 | 3];
}) {
  const isFirst = podiumRank === 1;

  return (
    <div className={`relative ${style.profile}`}>
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

      {isFirst ? (
        <div className="pointer-events-none absolute left-1/2 top-[72px] hidden w-44 -translate-x-1/2 justify-between text-amber-300 min-[640px]:flex">
          <Sparkles className="h-4 w-4" />
          <Sparkles className="mt-4 h-3 w-3" />
          <Sparkles className="h-4 w-4" />
        </div>
      ) : null}

      <div className="mt-3 flex justify-center">
        <div
          className={`relative flex rounded-full border p-2 shadow-sm ${style.avatarRing} ${style.iconColor} ${
            isFirst ? "p-3" : ""
          }`}
        >
          {isFirst && item.iconLg ? item.iconLg : item.icon}
        </div>
      </div>
      <p
        className={`mt-2 truncate text-sm font-semibold min-[375px]:text-base min-[376px]:max-[559px]:text-sm ${style.name}`}
      >
        {item.name}
      </p>
      <p className="truncate text-[11px] text-muted-foreground min-[375px]:text-xs">
        {item.subtitle}
      </p>
    </div>
  );
}

function EmptyRow() {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      Chưa có dữ liệu trong tháng này.
    </div>
  );
}
