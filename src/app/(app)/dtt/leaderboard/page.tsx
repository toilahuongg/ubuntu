import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Trophy } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { canManageDtt } from "@/lib/permissions";
import { DttClassModel, type DttClassRecord } from "@/lib/models/dtt-class";
import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
import { connectToDatabase } from "@/lib/mongoose";
import { getDttClassLeaderboard } from "@/lib/services/leaderboard-service";
import { toObjectId } from "@/lib/utils/ids";
import type { LeaderboardEntry } from "@/lib/services/gamification-service";

import { LevelAvatar } from "@/components/level-avatar";
import { CosmeticName } from "@/components/cosmetic-name";
import { Podium, type PodiumItem } from "@/app/(app)/leaderboard/podium";
import { DttLeaderboardFilters } from "./dtt-leaderboard-filters";

export const dynamic = "force-dynamic";

type LeaderboardSearchParams = {
  classId?: string | string[] | undefined;
  taskId?: string | string[] | undefined;
};

function getSingleParam(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

function getDayOfWeekLabel(dayNum: number): string {
  const labels: Record<number, string> = {
    1: "Thứ Hai",
    2: "Thứ Ba",
    3: "Thứ Tư",
    4: "Thứ Năm",
    5: "Thứ Sáu",
    6: "Thứ Bảy",
    7: "Chủ Nhật",
  };
  return labels[dayNum] || `Thứ ${dayNum}`;
}

function formatDttDate(dateKey: string): string {
  const parts = dateKey.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateKey;
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
      <LevelAvatar
        src={entry.levelInfo.icon}
        alt={entry.levelInfo.nameVi}
        equipped={entry.equipped}
        size={64}
        className="h-16 w-16 shrink-0 rounded-full object-cover"
        imageClassName="rounded-full"
      />
    ),
    iconLg: (
      <LevelAvatar
        src={entry.levelInfo.icon}
        alt={entry.levelInfo.nameVi}
        equipped={entry.equipped}
        size={88}
        className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-[88px] sm:w-[88px]"
        imageClassName="rounded-full"
      />
    ),
  };
}

export default async function DttLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<LeaderboardSearchParams>;
}) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
    return null;
  }

  await connectToDatabase();

  const isManager = canManageDtt(session);
  const enrollment = await DttEnrollmentModel.findOne({ userId: session.id }).lean();

  if (!isManager && !enrollment) {
    return (
      <div className="mx-auto max-w-xl space-y-6 animate-slide-up py-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Bảng Xếp Hạng ĐTT</h1>
          <p className="text-sm text-muted-foreground font-medium">Trường học Đấng Tiên Tri</p>
        </div>

        <div className="glass-card relative overflow-hidden p-6 text-center border border-border bg-white/70 dark:bg-slate-950/20 shadow-xl rounded-2xl">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.1),transparent_50%)]" />
          
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <GraduationCap className="h-7 w-7" />
          </div>

          <h3 className="text-base font-semibold text-foreground">Bạn chưa tham gia lớp học</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Bảng xếp hạng này chỉ hiển thị cho học viên đã ghi danh hoặc quản lý lớp học ĐTT.
          </p>

          <div className="mt-6 flex flex-col min-[400px]:flex-row gap-3 justify-center items-center">
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-1.5 justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors w-full min-[400px]:w-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Bảng xếp hạng chung
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background/50 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-overlay-subtle hover:text-foreground transition-all w-full min-[400px]:w-auto"
            >
              Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let activeClassId: string | undefined = undefined;
  let classes: DttClassRecord[] = [];

  const resolvedSearchParams = await searchParams;
  const classParam = getSingleParam(resolvedSearchParams.classId);
  const taskParam = getSingleParam(resolvedSearchParams.taskId);

  if (isManager) {
    const teamId = session.teamId ? toObjectId(session.teamId) : null;
    classes = teamId ? (await DttClassModel.find({ teamId }).lean()) as DttClassRecord[] : [];
    
    if (classParam) {
      const exists = classes.some((c) => c._id.toString() === classParam);
      if (exists) {
        activeClassId = classParam;
      } else {
        activeClassId = classes.length > 0 ? classes[0]._id.toString() : undefined;
      }
    } else if (classes.length > 0) {
      activeClassId = classes[0]._id.toString();
    }
  } else if (enrollment) {
    activeClassId = enrollment.classId.toString();
  }

  if (!activeClassId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
        <div className="space-y-3">
          <div>
            <h1 className="font-display text-xl font-bold">Bảng Xếp Hạng ĐTT</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Trường học Đấng Tiên Tri
            </p>
          </div>
        </div>
        
        {isManager && (
          <DttLeaderboardFilters
            classes={classes.map((c) => ({ id: c._id.toString(), name: c.name }))}
            tasks={[]}
            activeClassId={undefined}
            activeTaskId={taskParam}
            showClassSelect={isManager}
          />
        )}

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Chưa có lớp học ĐTT nào.
          </p>
        </div>
      </div>
    );
  }

  const { classInfo, entries, tasks } = await getDttClassLeaderboard(activeClassId, taskParam);
  const dateRangeStr = `${formatDttDate(classInfo.startStr)} - ${formatDttDate(classInfo.endStr)}`;
  const startDayName = getDayOfWeekLabel(classInfo.startDayOfWeek);

  const podiumItems = entries.map((entry) =>
    userToPodiumItem(entry, entry.id === session.id)
  );

  const unit = taskParam && taskParam !== "weekly-total" ? "lần" : "điểm";

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-xl font-bold">Bảng Xếp Hạng ĐTT</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Lớp học {classInfo.name} — Tuần {dateRangeStr} (Bắt đầu từ {startDayName})
          </p>
        </div>

        <DttLeaderboardFilters
          classes={classes.map((c) => ({ id: c._id.toString(), name: c.name }))}
          tasks={tasks}
          activeClassId={activeClassId}
          activeTaskId={taskParam}
          showClassSelect={isManager}
        />
      </div>

      <Section title="Thành viên học tập" icon={<Trophy className="h-4 w-4" />}>
        {entries.length === 0 ? <EmptyRow /> : <Podium items={podiumItems} unit={unit} />}
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

function EmptyRow() {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      Chưa có dữ liệu trong tuần này.
    </div>
  );
}
