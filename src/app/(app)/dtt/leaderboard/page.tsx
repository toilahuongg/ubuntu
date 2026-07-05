import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";

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
      <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
        <div className="space-y-3">
          <div>
            <h1 className="font-display text-xl font-bold">Bảng Xếp Hạng ĐTT</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Trường học Đấng Tiên Tri
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Bạn không tham gia lớp học ĐTT nào.
          </p>
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
