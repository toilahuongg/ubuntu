import { redirect } from "next/navigation";
import Image from "next/image";
import { Crown, MapPin, Trophy, Users } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import {
  getLeaderboardMonthLabel,
  getTopMembers,
  getTopRegionalLeads,
  getTopRegions,
  type RegionLeaderboardEntry,
} from "@/lib/services/leaderboard-service";
import type { LeaderboardEntry } from "@/lib/services/gamification-service";

export default async function LeaderboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [topRegions, topMembers, topLeads] = await Promise.all([
    getTopRegions(3),
    getTopMembers(5),
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
          <div className="divide-y divide-border">
            {topRegions.map((region) => (
              <RegionRow key={region.id} region={region} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Top Thành viên" icon={<Users className="h-4 w-4" />}>
        {topMembers.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="divide-y divide-border">
            {topMembers.map((entry) => (
              <UserRow
                key={entry.id}
                entry={entry}
                isSelf={entry.id === session.id}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Top Khu vực trưởng"
        icon={<Crown className="h-4 w-4" />}
      >
        {topLeads.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="divide-y divide-border">
            {topLeads.map((entry) => (
              <UserRow
                key={entry.id}
                entry={entry}
                isSelf={entry.id === session.id}
              />
            ))}
          </div>
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
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
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

function UserRow({
  entry,
  isSelf,
}: {
  entry: LeaderboardEntry;
  isSelf: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        isSelf ? "bg-overlay-subtle" : ""
      }`}
    >
      <RankBadge rank={entry.rank} />
      <Image
        src={entry.levelInfo.icon}
        alt={entry.levelInfo.nameVi}
        width={28}
        height={28}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={entry.fullName}>
          {entry.fullName}
          {isSelf && (
            <span className="ml-1 text-xs text-muted-foreground">(bạn)</span>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Lv.{entry.level} — {entry.levelInfo.nameVi}
        </p>
      </div>
      <XpValue xp={entry.totalXp} />
    </div>
  );
}

function RegionRow({ region }: { region: RegionLeaderboardEntry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <RankBadge rank={region.rank} />
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-overlay-subtle">
        <Trophy className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={region.name}>
          {region.name}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {region.code} — {region.memberCount} thành viên
        </p>
      </div>
      <XpValue xp={region.totalXp} />
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
