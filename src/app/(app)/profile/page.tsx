import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Coins, LogOut, MapPin, Sparkles, Star, Trophy, Users, Zap, History, Map } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { ROLE_LABELS } from "@/lib/domain";
import { getUserProgress, getXpHistory } from "@/lib/services/gamification-service";
import { getUserOrgContext } from "@/lib/services/organization-service";
import { getInventory } from "@/lib/services/cosmetics-service";
import { serializeEquipped } from "@/lib/cosmetics/serialize";
import { getAllLevelInfos } from "@/lib/level-utils";
import { CosmeticName } from "@/components/cosmetic-name";
import { EditProfileForm } from "./edit-profile-form";
import { LogoutButton } from "./logout-button";

export default async function ProfilePage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const [progress, xpHistory, orgContext, inventory] = await Promise.all([
    getUserProgress(session.id),
    getXpHistory(session.id, 10),
    getUserOrgContext({
      teamId: session.teamId,
      zoneId: session.zoneId,
      regionId: session.regionId,
    }),
    getInventory(session.id),
  ]);
  const equippedView = serializeEquipped(inventory.equipped);

  const allLevels = getAllLevelInfos(session.gender ?? "male");
  const progressPercent =
    progress.nextLevelXp > progress.currentLevelXp
      ? Math.round(
          ((progress.progressXp - progress.currentLevelXp) /
            (progress.nextLevelXp - progress.currentLevelXp)) *
            100,
        )
      : 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      {/* Profile header */}
      <div className="glass-card flex flex-col items-center p-6 text-center">
        <div className="relative mb-3">
          <Image
            src={progress.levelInfo.icon}
            alt={progress.levelInfo.nameVi}
            width={72}
            height={72}
            className="drop-shadow-lg"
          />
        </div>
        <h1 className="font-display text-lg font-bold">
          <CosmeticName fullName={session.fullName} equipped={equippedView} />
        </h1>
        <p className="text-xs text-muted-foreground">
          {ROLE_LABELS[session.role]}
        </p>
        {session.bio && (
          <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
            {session.bio}
          </p>
        )}

        {/* Level info */}
        <div className="mt-4 w-full">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold">
              Lv.{progress.level} — {progress.levelInfo.nameVi}
            </span>
            <span className="text-muted-foreground">
              {progress.totalXp} XP
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-overlay-medium">
            <div
              className="progress-glow h-full rounded-full bg-foreground/80 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] text-muted-foreground">
            {progress.progressXp - progress.currentLevelXp} /{" "}
            {progress.nextLevelXp - progress.currentLevelXp} XP
          </p>
        </div>
      </div>

      {/* Equipment summary */}
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Trang bị tên
        </h2>
        <Link
          href="/shop"
          className="glass-card flex items-center gap-3 p-4 transition-colors hover:bg-overlay-subtle"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-overlay-medium">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              <CosmeticName
                fullName={session.fullName}
                equipped={equippedView}
              />
            </p>
            <p className="text-[11px] text-muted-foreground">
              Số dư:{" "}
              <span className="inline-flex items-center gap-0.5">
                <Coins className="h-3 w-3 text-amber-300" />
                {inventory.pointBalance.toLocaleString("vi-VN")} điểm
              </span>
              {" · "}
              {inventory.owned.length} trang bị đã sở hữu
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            Đi đến cửa hàng →
          </span>
        </Link>
      </section>

      {/* Organization context */}
      {(orgContext.region || orgContext.zone || orgContext.team) && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Đơn vị trực thuộc
          </h2>
          <div className="glass-card divide-y divide-border overflow-hidden">
            {orgContext.region && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Map className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">Khu vực</p>
                  <p className="truncate text-sm font-medium">
                    {orgContext.region.name}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {orgContext.region.code}
                </span>
              </div>
            )}
            {orgContext.zone && (
              <div className="flex items-center gap-3 px-4 py-3">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">Địa vực</p>
                  <p className="truncate text-sm font-medium">
                    {orgContext.zone.name}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {orgContext.zone.code}
                </span>
              </div>
            )}
            {orgContext.team && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">Nhóm</p>
                  <p className="truncate text-sm font-medium">
                    {orgContext.team.name}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {orgContext.team.code}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="glass-card flex flex-col items-center p-3">
          <Star className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{progress.level}</p>
          <p className="text-[11px] text-muted-foreground">Cấp bậc</p>
        </div>
        <div className="glass-card flex flex-col items-center p-3">
          <Zap className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{progress.totalXp}</p>
          <p className="text-[11px] text-muted-foreground">Tổng XP</p>
        </div>
        <div className="glass-card flex flex-col items-center p-3">
          <Trophy className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-lg font-bold">{xpHistory.total}</p>
          <p className="text-[11px] text-muted-foreground">Lần nộp</p>
        </div>
      </div>

      {/* XP History */}
      {xpHistory.entries.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <History className="mr-1 inline h-3.5 w-3.5" />
            Lịch sử XP gần đây
          </h2>
          <div className="glass-card divide-y divide-border overflow-hidden">
            {xpHistory.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{entry.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="ml-3 text-sm font-bold text-foreground/80">
                  +{entry.amount}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Level roadmap */}
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Lộ trình cấp bậc
        </h2>
        <div className="glass-card grid grid-cols-3 gap-2 p-4 sm:grid-cols-6">
          {allLevels.map((level) => (
            <div
              key={level.level}
              className={`flex flex-col items-center rounded-xl p-2 ${
                level.level === progress.level
                  ? "bg-overlay-medium"
                  : level.level < progress.level
                    ? "opacity-50"
                    : "opacity-30"
              }`}
            >
              <Image
                src={level.icon}
                alt={level.nameVi}
                width={32}
                height={32}
              />
              <p className="mt-1 text-center text-[10px] font-medium leading-tight">
                {level.nameVi}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Edit profile */}
      <EditProfileForm
        initialFullName={session.fullName}
        initialGender={(session.gender ?? "male") as "male" | "female"}
        initialBio={session.bio ?? ""}
        level={progress.level}
      />

      {/* Logout */}
      <LogoutButton />
    </div>
  );
}
