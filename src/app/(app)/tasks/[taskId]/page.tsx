import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { getTaskDetail } from "@/lib/tasks/task-service";
import { getTaskReminderSettings } from "@/lib/tasks/reminder-service";
import { getTodayDateKey } from "@/lib/dates";
import { listTaskActivitiesThisMonth } from "@/lib/tasks/activity-service";
import { canProxySubmit } from "@/lib/permissions";
import {
  isDailyTaskType,
  supportsMonthlyGoal,
  TASK_TYPE_LABELS,
} from "@/lib/tasks/constants";
import { SubmitSection } from "./submit-section";
import { MonthActivity } from "./month-activity";
import { TaskDetailActions } from "./task-detail-actions";
import { LinkifyText } from "@/components/linkify-text";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const { taskId } = await params;
  const dateKey = getTodayDateKey();

  const [detail, activities, reminderSettings] = await Promise.all([
    getTaskDetail(session, taskId, dateKey, session.id),
    listTaskActivitiesThisMonth(session, taskId),
    getTaskReminderSettings(session, taskId),
  ]);

  const deadlineTime = new Date(detail.deadlineAt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel =
    detail.status === "COMPLETED"
      ? "Đã hoàn thành"
      : detail.status === "OPEN"
        ? "Đang mở"
        : "Đã khoá";

  const isCountTotal = detail.taskType === "COUNT_TOTAL";
  const hasMonthlyGoal =
    supportsMonthlyGoal(detail.taskType) && detail.isApplicableToActor;
  const isDaily = isDailyTaskType(detail.taskType);
  const progressUnit = isDaily ? "ngày" : "lượt";

  const proxyCandidates = detail.rosterMembers.filter(
    (m) => m.id !== session.id && canProxySubmit(session, m),
  );
  const proxyHint =
    proxyCandidates.length > 0
      ? `Bạn + ${proxyCandidates.length} thành viên khác`
      : "Nhập bù cho các ngày trong tháng";
  const canOpenTaskActions =
    detail.isApplicableToActor && (hasMonthlyGoal || Boolean(reminderSettings));

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-overlay-subtle hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
          {canOpenTaskActions && (
            <TaskDetailActions
              monthlyGoal={
                hasMonthlyGoal
                  ? {
                      taskId: detail.id,
                      yearMonth: detail.yearMonth,
                      currentGoal: detail.monthlyGoal,
                      unitLabel: progressUnit,
                    }
                  : undefined
              }
              reminder={
                reminderSettings
                  ? {
                      defaultReminderTime: reminderSettings.defaultReminderTime,
                      effectiveReminderTime: reminderSettings.effectiveReminderTime,
                      initialEnabled: reminderSettings.enabled,
                      initialReminderTime: reminderSettings.reminderTime,
                      isCappedBeforeDeadline: reminderSettings.isCappedBeforeDeadline,
                      taskId: detail.id,
                    }
                  : undefined
              }
            />
          )}
        </div>
        <h1 className="font-display text-xl font-bold">{detail.title}</h1>
        {detail.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            <LinkifyText text={detail.description} />
          </p>
        )}
        {detail.externalUrl && (
          <a
            href={detail.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-primary/30 bg-primary px-4 py-2 text-sm font-semibold text-background shadow-[0_10px_28px_-18px_var(--primary)] transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {detail.externalLabel || "Mở liên kết"}
          </a>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Hạn: {deadlineTime}
          </span>
          {detail.expReward > 0 && (
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              +{detail.expReward} XP
            </span>
          )}
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {detail.totalCompletions} lượt hôm nay
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              detail.status === "COMPLETED"
                ? "bg-primary/20 text-primary"
                : detail.status === "OPEN"
                  ? "bg-overlay-medium text-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {statusLabel}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase">
            {TASK_TYPE_LABELS[detail.taskType]}
          </span>
        </div>
      </div>

      {isCountTotal && detail.targetCount !== null && (
        <section className="glass-card space-y-2 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold">
              Tiến độ chung của cả nhóm
            </h2>
          </div>
          <ProgressBar
            current={detail.totalAcrossAll}
            target={detail.targetCount}
          />
          <p className="text-xs text-muted-foreground">
            {detail.totalAcrossAll} / {detail.targetCount} lượt
            {detail.status === "COMPLETED" && " — 🎉 Đã hoàn thành mục tiêu!"}
          </p>
        </section>
      )}

      {hasMonthlyGoal && (
        <section className="space-y-3">
          <div className="glass-card space-y-2 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold">
                Tiến độ tháng {detail.yearMonth} của bạn
              </h2>
            </div>
            {detail.monthlyGoal !== null ? (
              <>
                <ProgressBar
                  current={detail.monthlyCompletion}
                  target={detail.monthlyGoal}
                />
                <p className="text-xs text-muted-foreground">
                  {detail.monthlyCompletion} / {detail.monthlyGoal}{" "}
                  {progressUnit}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Chưa đặt mục tiêu cho tháng này. Đã hoàn thành{" "}
                {detail.monthlyCompletion} {progressUnit}.
              </p>
            )}
          </div>
        </section>
      )}

      {detail.isApplicableToActor ? (
        <>
          <SubmitSection
            taskId={detail.id}
            subjectUserId={session.id}
            myCompletionCount={detail.myCompletionCount}
            status={detail.status}
            taskType={detail.taskType}
          />
        </>
      ) : (
        <div className="glass-card p-4 text-sm text-muted-foreground">
          Nhiệm vụ này không áp dụng cho vai trò của bạn.
        </div>
      )}

      <Link
        href={`/tasks/${detail.id}/proxy`}
        className="glass-card flex items-center justify-between p-4 transition-colors hover:bg-overlay-subtle"
      >
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Lịch & nhập bù</p>
            <p className="text-xs text-muted-foreground">{proxyHint}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <MonthActivity activities={activities} />
    </div>
  );
}

function ProgressBar({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-overlay-subtle"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={`Tiến độ ${pct}%`}
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
