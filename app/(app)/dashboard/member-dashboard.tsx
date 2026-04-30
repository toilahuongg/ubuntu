import { Calendar, CheckCircle2 } from "lucide-react";

import { formatDateLabel } from "@/lib/dates";
import type { ActivityEntry } from "@/lib/tasks/activity-service";
import type { MemberDashboardView } from "@/lib/tasks/types";
import { ActivityFeed } from "./activity-feed";
import { GoalNoticeBanner } from "./goal-notice-banner";
import { LevelProgressCard } from "./level-progress-card";
import { TaskCardSection } from "./task-card-sections";

export function MemberDashboard({
  data,
  activities,
  userId,
}: {
  data: MemberDashboardView;
  activities: ActivityEntry[];
  userId: string;
}) {
  const progressPercent =
    data.nextLevelXp > 0
      ? Math.min(
          100,
          Math.round((data.progressXp / data.nextLevelXp) * 100),
        )
      : 0;
  const monthlyCards = data.cards.filter(
    (card) => card.taskType === "MONTHLY_PER_MEMBER",
  );
  const todayCards = data.cards.filter(
    (card) => card.taskType !== "MONTHLY_PER_MEMBER",
  );
  const completedCount = data.cards.filter((card) => card.myCompletionCount > 0).length;
  const pendingCount = Math.max(data.cards.length - completedCount, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="inline-flex items-center gap-2 rounded-full bg-overlay-subtle px-3 py-1 shadow-sm ring-1 ring-border">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{formatDateLabel(data.date)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {todayCards.length} nhiệm vụ hôm nay
          </div>
          {monthlyCards.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full bg-overlay-subtle px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
              <span className="h-2 w-2 rounded-full bg-[color:var(--warning)]" />
              {monthlyCards.length} nhiệm vụ tháng
            </div>
          )}
        </div>
      </div>

      <LevelProgressCard
        completedCount={completedCount}
        dailyScripture={data.dailyScripture}
        level={data.level}
        levelIcon={data.levelIcon}
        levelName={data.levelName}
        nextLevelXp={data.nextLevelXp}
        pendingCount={pendingCount}
        progressPercent={progressPercent}
        progressXp={data.progressXp}
        totalXp={data.totalXp}
      />

      <GoalNoticeBanner notice={data.goalNotice} />

      <TaskCardSection
        title="Nhiệm vụ hôm nay"
        cards={todayCards}
        userId={userId}
        variant="member"
      />

      <TaskCardSection
        title="Nhiệm vụ tháng"
        cards={monthlyCards}
        userId={userId}
        variant="member"
      />

      {data.cards.length === 0 && (
        <div className="glass-card flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có nhiệm vụ nào hôm nay.
          </p>
        </div>
      )}

      <ActivityFeed activities={activities} />
    </div>
  );
}
