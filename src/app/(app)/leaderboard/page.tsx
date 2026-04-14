import { redirect } from "next/navigation";
import Image from "next/image";
import { Trophy } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { getTeamLeaderboard } from "@/lib/services/gamification-service";

export default async function LeaderboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!session.teamId) {
    return (
      <div className="mx-auto max-w-2xl animate-slide-up">
        <h1 className="mb-6 font-display text-xl font-bold">Bảng Xếp Hạng</h1>
        <div className="glass-card flex flex-col items-center py-12 text-center">
          <Trophy className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Bạn chưa được gán vào nhóm nào.
          </p>
        </div>
      </div>
    );
  }

  const leaderboard = await getTeamLeaderboard(session.teamId);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <h1 className="font-display text-xl font-bold">Bảng Xếp Hạng</h1>

      {/* Top 3 podium */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          <PodiumCard entry={leaderboard[1]!} position={2} />
          <PodiumCard entry={leaderboard[0]!} position={1} />
          <PodiumCard entry={leaderboard[2]!} position={3} />
        </div>
      )}

      {/* Full list */}
      <div className="glass-card divide-y divide-border overflow-hidden">
        {leaderboard.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              entry.id === session.id ? "bg-white/6" : ""
            }`}
          >
            {/* Rank */}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                entry.rank <= 3
                  ? "bg-white/12 text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {entry.rank}
            </span>

            {/* Badge */}
            <Image
              src={entry.levelInfo.icon}
              alt={entry.levelInfo.nameVi}
              width={28}
              height={28}
              className="shrink-0"
            />

            {/* Name */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {entry.fullName}
                {entry.id === session.id && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (bạn)
                  </span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Lv.{entry.level} — {entry.levelInfo.nameVi}
              </p>
            </div>

            {/* XP */}
            <span className="text-sm font-bold tabular-nums">
              {entry.totalXp.toLocaleString("vi-VN")}
              <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                XP
              </span>
            </span>
          </div>
        ))}

        {leaderboard.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu xếp hạng.
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  position,
}: {
  entry: { fullName: string; levelInfo: { icon: string; nameVi: string }; totalXp: number; rank: number };
  position: 1 | 2 | 3;
}) {
  const heights = { 1: "h-28", 2: "h-20", 3: "h-16" } as const;
  const sizes = { 1: 48, 2: 36, 3: 36 } as const;

  return (
    <div className="flex w-24 flex-col items-center">
      <Image
        src={entry.levelInfo.icon}
        alt={entry.levelInfo.nameVi}
        width={sizes[position]}
        height={sizes[position]}
        className="mb-2 drop-shadow-lg"
      />
      <p className="mb-1 w-full truncate text-center text-xs font-semibold">
        {entry.fullName}
      </p>
      <p className="mb-2 text-[10px] text-muted-foreground">
        {entry.totalXp.toLocaleString("vi-VN")} XP
      </p>
      <div
        className={`glass-card flex w-full items-center justify-center rounded-t-xl ${heights[position]}`}
      >
        <span className="text-lg font-bold">{position}</span>
      </div>
    </div>
  );
}
