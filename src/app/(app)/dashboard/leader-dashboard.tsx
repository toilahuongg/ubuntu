import { Calendar, CheckCircle2 } from "lucide-react";

import { CompletionTrendCard } from "@/components/completion-trend-card";
import { formatDateLabel } from "@/lib/dates";
import { SCOPE_LABELS, type SessionUser } from "@/lib/domain";
import type { ActivityEntry } from "@/lib/tasks/activity-service";
import type { LeaderDashboardView } from "@/lib/tasks/types";
import { ActivityFeed } from "./activity-feed";
import { GoalNoticeBanner } from "./goal-notice-banner";
import { LevelProgressCard } from "./level-progress-card";
import { TaskCardSection } from "./task-card-sections";

export function LeaderDashboard({
  data,
  activities,
  user,
  userId,
}: {
  data: LeaderDashboardView;
  activities: ActivityEntry[];
  user: Pick<SessionUser, "fullName" | "role">;
  userId: string;
}) {
  const monthlyCards = data.cards.filter(
    (card) => card.taskType === "MONTHLY_PER_MEMBER",
  );
  const weeklyCards = data.cards.filter(
    (card) => card.taskType === "WEEKLY_PER_MEMBER",
  );
  const todayCards = data.cards.filter(
    (card) =>
      card.taskType !== "MONTHLY_PER_MEMBER" &&
      card.taskType !== "WEEKLY_PER_MEMBER",
  );
  const personalCards = data.cards.filter((card) => card.isApplicableToActor);
  const completedCount = personalCards.filter(
    (card) => card.myCompletionCount > 0,
  ).length;
  const pendingCount = Math.max(personalCards.length - completedCount, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="inline-flex items-center gap-2 rounded-full bg-overlay-subtle px-3 py-1 shadow-sm ring-1 ring-border">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{formatDateLabel(data.date)}</span>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/20">
          {SCOPE_LABELS[data.scopeLabel]}
        </span>
      </div>

      <LevelProgressCard
        completedCount={completedCount}
        dailyScripture={data.dailyScripture}
        equipped={data.equipped}
        level={data.level}
        levelDescription={data.levelDescription}
        levelIcon={data.levelIcon}
        levelName={data.levelName}
        nextLevelXp={data.nextLevelXp}
        pendingCount={pendingCount}
        totalXp={data.totalXp}
        user={user}
      />

      <GoalNoticeBanner notice={data.goalNotice} />

      {data.campaign && data.campaign.cards.length > 0 && (
        <TaskCardSection
          title="Chiến dịch hôm nay"
          cards={data.campaign.cards}
          userId={userId}
          variant="leader"
        />
      )}

      <TaskCardSection
        title="Nhiệm vụ hôm nay"
        cards={todayCards}
        userId={userId}
        variant="leader"
      />

      <TaskCardSection
        title="Nhiệm vụ tuần"
        cards={weeklyCards}
        userId={userId}
        variant="leader"
      />

      <TaskCardSection
        title="Nhiệm vụ tháng"
        cards={monthlyCards}
        userId={userId}
        variant="leader"
      />

      {data.cards.length === 0 && (
        <div className="glass-card flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có nhiệm vụ nào hôm nay.
          </p>
        </div>
      )}

      <CompletionTrendCard
        data={data.trends}
        description="Tổng lượt hoàn thành của cá nhân bạn."
        todayCount={data.trends.at(-1)?.completed || 0}
      />

      <ActivityFeed activities={activities} />
    </div>
  );
}
