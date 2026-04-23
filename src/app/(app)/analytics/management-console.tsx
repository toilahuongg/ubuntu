"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Goal,
  Layers3,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import type {
  ManagementConsoleView,
  ManagementGroup,
  ManagementInsight,
  ManagementMember,
  ManagementTask,
} from "@/lib/services/management-console-service";
import { TASK_TYPE_LABELS } from "@/lib/tasks/constants";
import { AnalyticsChart } from "./analytics-chart";

type TabId = "overview" | "results" | "goals" | "analysis";

const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "Tổng quan", icon: Layers3 },
  { id: "results", label: "Kết quả", icon: ListChecks },
  { id: "goals", label: "Mục tiêu", icon: Target },
  { id: "analysis", label: "Phân tích", icon: BarChart3 },
];

export function ManagementConsole({
  view,
  dateLabel,
}: {
  view: ManagementConsoleView;
  dateLabel: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const topMembers = useMemo(
    () =>
      [...view.members]
        .filter((member) => member.monthlyCompletion > 0)
        .sort((a, b) => b.monthlyCompletion - a.monthlyCompletion)
        .slice(0, 5),
    [view.members],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-slide-up">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dateLabel}
            </p>
            <h1 className="mt-1 truncate font-display text-xl font-bold">
              {view.scope.title}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {view.scope.subtitle}
            </p>
          </div>
          <div className="rounded-md bg-overlay-subtle px-2 py-1 text-[11px] font-semibold text-foreground/70">
            {view.yearMonth}
          </div>
        </div>

        {view.canViewManagedScope ? (
          <div className="inline-flex rounded-lg bg-overlay-subtle p-1">
            <Link
              href="/analytics"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                view.mode === "SELF"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cá nhân
            </Link>
            <Link
              href="/analytics?view=scope"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                view.mode === "SCOPE"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Phạm vi quản lý
            </Link>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label={view.mode === "SELF" ? "Cá nhân" : "Người trong phạm vi"}
            value={view.scope.subjectCount}
          />
          <StatCard
            icon={<ListChecks className="h-4 w-4" />}
            label="Nhiệm vụ áp dụng"
            value={view.summary.taskCount}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Hoàn thành hôm nay"
            value={`${view.summary.todayCompletionPercent}%`}
          />
          <StatCard
            icon={<Goal className="h-4 w-4" />}
            label="Tiến độ tháng"
            value={`${view.summary.monthlyProgressPercent}%`}
          />
        </div>
      </header>

      <nav
        aria-label="Bộ lọc điều hành"
        className="grid grid-cols-4 gap-1 rounded-lg bg-overlay-subtle p-1"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-10 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === "overview" && (
        <OverviewTab view={view} />
      )}
      {activeTab === "results" && (
        <ResultsTab members={view.members} />
      )}
      {activeTab === "goals" && (
        <GoalsTab tasks={view.tasks} />
      )}
      {activeTab === "analysis" && (
        <AnalysisTab view={view} topMembers={topMembers} />
      )}
    </div>
  );
}

function OverviewTab({ view }: { view: ManagementConsoleView }) {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3">
        <MetricTile
          label="Đã nộp hôm nay"
          value={view.summary.todayCompletionCount}
          detail={`${view.summary.todayCompletedSlots}/${view.summary.todayTotalSlots} ô nhiệm vụ`}
        />
        <MetricTile
          label="Còn lại hôm nay"
          value={view.summary.todayPendingSlots}
          detail="Tính theo người và nhiệm vụ"
        />
        <MetricTile
          label="Mục tiêu đã đặt"
          value={view.summary.monthlyGoalSet}
          detail={`${view.summary.monthlyGoalCoveragePercent}% độ phủ`}
        />
        <MetricTile
          label="Thiếu mục tiêu"
          value={view.summary.monthlyGoalMissing}
          detail="Không tính task theo số lần"
        />
      </section>

      <section>
        <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Cần chú ý" />
        {view.insights.length > 0 ? (
          <div className="space-y-2">
            {view.insights.map((insight) => (
              <InsightCard key={`${insight.type}-${insight.title}`} insight={insight} />
            ))}
          </div>
        ) : (
          <EmptyState text="Chưa có cảnh báo đáng chú ý trong phạm vi này." />
        )}
      </section>

      {view.mode === "SCOPE" ? (
        <section>
          <SectionTitle icon={<Layers3 className="h-4 w-4" />} title="Cấp dưới" />
          {view.groups.length > 0 ? (
            <div className="space-y-2">
              {view.groups.map((group) => (
                <GroupRow key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <EmptyState text="Chưa có dữ liệu cấp dưới để tổng hợp." />
          )}
        </section>
      ) : null}
    </div>
  );
}

function ResultsTab({ members }: { members: ManagementMember[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (members.length === 0) {
    return <EmptyState text="Chưa có thành viên nào trong phạm vi này." />;
  }

  return (
    <section className="space-y-2">
      <SectionTitle icon={<Users className="h-4 w-4" />} title="Kết quả thành viên" />
      {members.map((member) => {
        const isOpen = openId === member.id;
        return (
          <div key={member.id} className="glass-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : member.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-overlay-subtle"
              aria-expanded={isOpen}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{member.fullName}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {member.roleLabel}
                  {member.regionName ? ` · ${member.regionName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">
                    {member.monthlyProgressPercent}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    tháng
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
            {isOpen && (
              <div className="grid grid-cols-2 gap-3 border-t border-border p-4">
                <MetricTile
                  label="Hôm nay"
                  value={`${member.todayCompletedTasks}/${member.todayTaskCount}`}
                  detail={`${member.todayCompletionPercent}% hoàn thành`}
                />
                <MetricTile
                  label="Lượt tháng"
                  value={member.monthlyCompletion}
                  detail={`${member.monthlyGoal} mục tiêu`}
                />
                <MetricTile
                  label="Mục tiêu đã đặt"
                  value={member.monthlyGoalSetCount}
                  detail={`${member.monthlyTaskCount} task cần mục tiêu`}
                />
                <MetricTile
                  label="Thiếu mục tiêu"
                  value={member.monthlyGoalMissingCount}
                  detail={member.hasMetMonthlyGoal ? "Đã đạt tháng" : "Đang theo dõi"}
                />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function GoalsTab({ tasks }: { tasks: ManagementTask[] }) {
  const goalTasks = tasks.filter((task) => task.monthlyGoalSupported);
  const countTasks = tasks.filter((task) => !task.monthlyGoalSupported);

  return (
    <div className="space-y-5">
      <section>
        <SectionTitle icon={<Target className="h-4 w-4" />} title="Mục tiêu tháng" />
        {goalTasks.length > 0 ? (
          <div className="space-y-2">
            {goalTasks.map((task) => (
              <TaskGoalRow key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <EmptyState text="Chưa có nhiệm vụ nào hỗ trợ mục tiêu tháng." />
        )}
      </section>

      <section>
        <SectionTitle icon={<Goal className="h-4 w-4" />} title="Task theo số lần" />
        {countTasks.length > 0 ? (
          <div className="space-y-2">
            {countTasks.map((task) => (
              <TaskGoalRow key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <EmptyState text="Không có task theo số lần trong phạm vi hiện tại." />
        )}
      </section>
    </div>
  );
}

function AnalysisTab({
  view,
  topMembers,
}: {
  view: ManagementConsoleView;
  topMembers: ManagementMember[];
}) {
  return (
    <div className="space-y-5">
      <section className="glass-card overflow-hidden p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold">
              Xu hướng 14 ngày
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tổng lượt hoàn thành trong phạm vi quản lý.
            </p>
          </div>
          <span className="rounded-md bg-overlay-subtle px-2 py-0.5 text-[11px] font-semibold text-foreground/70">
            {view.summary.todayCompletionCount.toLocaleString("vi-VN")} hôm nay
          </span>
        </div>
        <AnalyticsChart data={view.trends} />
      </section>

      <section>
        <SectionTitle icon={<TrendingUp className="h-4 w-4" />} title="Nhiệm vụ nổi bật" />
        {view.taskDistribution.length > 0 ? (
          <div className="glass-card divide-y divide-border overflow-hidden">
            {view.taskDistribution.map((entry, index) => (
              <RankRow
                key={entry.taskId}
                rank={index + 1}
                label={entry.title}
                value={entry.completionCount}
              />
            ))}
          </div>
        ) : (
          <EmptyState text="Chưa có dữ liệu nhiệm vụ nổi bật trong 30 ngày." />
        )}
      </section>

      <section>
        <SectionTitle icon={<Users className="h-4 w-4" />} title="Đóng góp nổi bật" />
        {topMembers.length > 0 ? (
          <div className="glass-card divide-y divide-border overflow-hidden">
            {topMembers.map((member, index) => (
              <RankRow
                key={member.id}
                rank={index + 1}
                label={member.fullName}
                value={member.monthlyCompletion}
              />
            ))}
          </div>
        ) : (
          <EmptyState text="Chưa có lượt đóng góp trong tháng hiện tại." />
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass-card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none">{value}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="glass-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

function InsightCard({ insight }: { insight: ManagementInsight }) {
  const Icon =
    insight.tone === "danger"
      ? CircleAlert
      : insight.tone === "warning"
        ? AlertTriangle
        : insight.tone === "success"
          ? Sparkles
          : BarChart3;
  const toneClass =
    insight.tone === "danger"
      ? "text-destructive bg-destructive/10"
      : insight.tone === "warning"
        ? "text-amber-600 bg-amber-500/10"
        : insight.tone === "success"
          ? "text-primary bg-primary/10"
          : "text-muted-foreground bg-overlay-subtle";

  return (
    <div className="glass-card flex gap-3 p-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{insight.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{insight.detail}</p>
      </div>
    </div>
  );
}

function GroupRow({ group }: { group: ManagementGroup }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{group.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {group.memberCount} người · {group.todayCompletionPercent}% hôm nay
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">
            {group.monthlyProgressPercent}%
          </p>
          <p className="text-[10px] text-muted-foreground">tháng</p>
        </div>
      </div>
      <ProgressBar value={group.monthlyProgressPercent} />
    </div>
  );
}

function TaskGoalRow({ task }: { task: ManagementTask }) {
  const percent = task.monthlyGoalSupported
    ? task.monthlyProgressPercent
    : task.todayCompletionPercent;
  const detail = task.monthlyGoalSupported
    ? `${task.monthlyCompletionTotal}/${task.monthlyGoalTotal} ${task.unitLabel} · thiếu ${task.monthlyGoalMissingCount} mục tiêu`
    : `${task.todayCompletionCount} lượt hôm nay · mục tiêu chung ${task.targetCount ?? "chưa đặt"}`;

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={task.title}>
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold text-muted-foreground">
            <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5">
              {TASK_TYPE_LABELS[task.taskType]}
            </span>
            <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5">
              {task.scopeLabel}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">{percent}%</p>
          <p className="text-[10px] text-muted-foreground">
            {task.applicableCount} người
          </p>
        </div>
      </div>
      <ProgressBar value={percent} />
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function RankRow({
  rank,
  label,
  value,
}: {
  rank: number;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-overlay-subtle text-[11px] font-bold">
          {rank}
        </span>
        <p className="truncate text-sm font-medium" title={label}>
          {label}
        </p>
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums">
        {value.toLocaleString("vi-VN")}
      </span>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-overlay-subtle">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass-card py-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
