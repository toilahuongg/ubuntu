"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, Users } from "lucide-react";

import type {
  AdminOperationsCompletionDay,
  AdminOperationsMember,
  AdminOperationsSelection,
  AdminOperationsView,
} from "@/lib/services/admin-operations-types";
import { TASK_TYPE_LABELS } from "@/lib/tasks/constants";
import { AnalyticsChart } from "@/components/analytics-chart";

import {
  filterMembersForSelection,
  getActiveScopeLabel,
  getDisplayMemberProgress,
  getSelectionEmptyState,
  normalizeSelection,
} from "./operations-dashboard.helpers";

type OperationsDashboardProps = {
  allowTeamMemberProgress?: boolean;
  data: AdminOperationsView;
  initialSelection?: AdminOperationsSelection;
  showMemberProgress?: boolean;
};

const COMPLETION_HEAT_LEVELS: Array<{
  cellClassName: string;
  label: string;
  legendLabel: string;
  max: number;
}> = [
  {
    cellClassName: "bg-muted text-muted-foreground",
    label: "0 lượt",
    legendLabel: "0",
    max: 0,
  },
  {
    cellClassName: "bg-primary/10 text-primary",
    label: "1 lượt",
    legendLabel: "1",
    max: 1,
  },
  {
    cellClassName: "bg-primary/20 text-primary",
    label: "2 lượt",
    legendLabel: "2",
    max: 2,
  },
  {
    cellClassName: "bg-primary/35 text-foreground",
    label: "3 lượt",
    legendLabel: "3",
    max: 3,
  },
  {
    cellClassName: "bg-primary text-primary-foreground",
    label: "4+ lượt",
    legendLabel: "4+",
    max: Infinity,
  },
];

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    weekday: "long",
  }).format(parseDateKey(dateKey));
}

function getCompletionHeatLevel(completionCount: number) {
  return (
    COMPLETION_HEAT_LEVELS.find((level) => completionCount <= level.max) ??
    COMPLETION_HEAT_LEVELS[COMPLETION_HEAT_LEVELS.length - 1]
  );
}

function getInitialCompletionDate(
  days: AdminOperationsCompletionDay[],
  todayDate: string,
) {
  return (
    days.find((day) => day.date === todayDate)?.date ??
    days.find((day) => day.tasks.length > 0)?.date ??
    days[0]?.date ??
    todayDate
  );
}

function buildCalendarCells(days: AdminOperationsCompletionDay[]) {
  const firstDay = days[0];
  const leadingBlankCount = firstDay ? parseDateKey(firstDay.date).getUTCDay() : 0;
  const cells: Array<AdminOperationsCompletionDay | null> = [
    ...Array.from({ length: leadingBlankCount }, () => null),
    ...days,
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function buildCompletionTrend(members: AdminOperationsMember[]) {
  const completionByDate = new Map<string, number>();

  for (const member of members) {
    for (const day of member.completionDays) {
      completionByDate.set(
        day.date,
        (completionByDate.get(day.date) ?? 0) + day.completionCount,
      );
    }
  }

  return Array.from(completionByDate.entries())
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, completed]) => ({ completed, date }));
}

export function OperationsDashboard({
  allowTeamMemberProgress = false,
  data,
  initialSelection,
  showMemberProgress = false,
}: OperationsDashboardProps) {
  const selection = initialSelection ?? data.selectionDefaults;
  const normalizedSelection = normalizeSelection(data, selection);
  const activeScopeLabel = getActiveScopeLabel(data, normalizedSelection);
  const activeMembers = filterMembersForSelection(data, normalizedSelection);
  const emptyState = getSelectionEmptyState(data, normalizedSelection, {
    allowTeamMemberProgress,
  });
  const completionTrend = buildCompletionTrend(activeMembers);
  const todayCompletionCount =
    completionTrend.find((point) => point.date === data.dateKey)?.completed ?? 0;
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [selectedCompletionDate, setSelectedCompletionDate] = useState(data.dateKey);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const displayMemberProgress = getDisplayMemberProgress(
    activeMembers,
    selectedTaskId,
  );

  return (
    <div className="space-y-4">
      <section className="glass-card overflow-hidden p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold">
              Tiến độ tháng
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {activeScopeLabel}
            </p>
          </div>
          <span className="rounded-md bg-overlay-subtle px-2 py-0.5 text-[11px] font-semibold text-foreground/70">
            {todayCompletionCount.toLocaleString("vi-VN")} hôm nay
          </span>
        </div>

        <AnalyticsChart data={completionTrend} />
      </section>

      {showMemberProgress && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                <Users className="h-4 w-4" />
                Tiến độ thành viên
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {allowTeamMemberProgress && normalizedSelection.teamId
                  ? "Danh sách tiến độ tháng của toàn bộ thành viên trong chi hội."
                  : "Danh sách tiến độ tháng trong phạm vi đang chọn."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {data.tasks && data.tasks.length > 0 && (
                <select
                  value={selectedTaskId ?? ""}
                  onChange={(e) => setSelectedTaskId(e.target.value || null)}
                  className="form-select h-8 py-0 pl-2 pr-7 text-[11px] font-medium rounded-md w-[150px] sm:w-[180px] bg-card border-border/60 hover:border-primary/35"
                  aria-label="Chọn nhiệm vụ"
                >
                  <option value="">Tất cả nhiệm vụ</option>
                  {data.tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              )}
              <span className="rounded-md border border-border/60 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shrink-0">
                {activeMembers.length} người
              </span>
              <span className="rounded-md border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground shrink-0">
                Tháng
              </span>
            </div>
          </div>

          {emptyState ? (
            <EmptyCard text={emptyState} />
          ) : (
            <div className="glass-card divide-y divide-border/60 overflow-hidden">
              {displayMemberProgress.map((progress) => {
                const { member } = progress;
                const isOpen = openMemberId === member.id;

                return (
                  <div key={member.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMemberId(isOpen ? null : member.id);
                        if (!isOpen) {
                          setSelectedCompletionDate(
                            getInitialCompletionDate(
                              member.completionDays,
                              data.dateKey,
                            ),
                          );
                        }
                      }}
                      className="grid w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:grid-cols-[minmax(0,1fr)_auto]"
                      aria-expanded={isOpen}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {member.fullName}
                          </p>
                          <span className="rounded-md border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {member.roleLabel}
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              progress.status === "needs_attention"
                                ? "bg-amber-500"
                                : progress.status === "complete"
                                  ? "bg-emerald-500"
                                  : "bg-primary"
                            }`}
                            style={{ width: `${progress.completionPercent}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {progress.completed}/{progress.assigned} task slot hoàn thành trong tháng
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center justify-end">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isOpen ? (
                      <MemberCompletionCalendar
                        days={member.completionDays}
                        selectedDate={selectedCompletionDate}
                        todayDate={data.dateKey}
                        onSelectDate={setSelectedCompletionDate}
                        selectedTaskId={selectedTaskId}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}


function MemberCompletionCalendar({
  days,
  selectedDate,
  todayDate,
  onSelectDate,
  selectedTaskId = null,
}: {
  days: AdminOperationsCompletionDay[];
  onSelectDate: (date: string) => void;
  selectedDate: string;
  todayDate: string;
  selectedTaskId?: string | null;
}) {
  const filteredDays = days.map((day) => {
    if (!selectedTaskId) return day;

    const filteredTasks = day.tasks.filter((t) => t.id === selectedTaskId);
    const completionCount = filteredTasks.reduce(
      (sum, t) => sum + t.completionCount,
      0,
    );
    return {
      ...day,
      completionCount,
      tasks: filteredTasks,
    };
  });

  const selectedDay =
    filteredDays.find((day) => day.date === selectedDate) ??
    filteredDays.find((day) => day.date === todayDate) ??
    filteredDays[0];
  const calendarCells = buildCalendarCells(filteredDays);
  const totalCompletionCount = filteredDays.reduce(
    (total, day) => total + day.completionCount,
    0,
  );

  return (
    <div className="border-t border-border/60 bg-muted/35 px-3 py-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          Thống kê từng ngày trong tháng
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {COMPLETION_HEAT_LEVELS.map((level) => (
            <span key={level.label} className="inline-flex items-center gap-1">
              <span
                className={`h-2.5 w-2.5 rounded-[3px] ring-1 ring-border/60 ${level.cellClassName}`}
              />
              {level.legendLabel}
            </span>
          ))}
          <span className="rounded-md border border-border/60 bg-card px-2 py-0.5 font-medium text-foreground">
            {totalCompletionCount} lượt
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)]">
        <div className="rounded-lg border border-border/60 bg-card p-2">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
            {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((day, index) => {
              if (!day) {
                return (
                  <span
                    key={`blank-${index}`}
                    className="aspect-square rounded-md bg-muted/45"
                    aria-hidden="true"
                  />
                );
              }

              const heat = getCompletionHeatLevel(day.completionCount);
              const isSelected = day.date === selectedDay?.date;
              const isToday = day.date === todayDate;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onSelectDate(day.date)}
                  className={`relative aspect-square rounded-md border text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                    day.completionCount > 0
                      ? heat.cellClassName
                      : "bg-card text-muted-foreground"
                  } ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border/60 hover:border-primary/35"
                  }`}
                  title={`${formatDateLabel(day.date)}: ${day.completionCount} lượt hoàn thành (${heat.label})`}
                  aria-label={`${formatDateLabel(day.date)}: ${day.completionCount} lượt hoàn thành (${heat.label})`}
                >
                  <span className="absolute left-1.5 top-1">
                    {parseDateKey(day.date).getUTCDate()}
                  </span>
                  {isToday ? (
                    <span
                      className="absolute bottom-1 left-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-1 ring-background"
                      aria-hidden="true"
                    />
                  ) : null}
                  {day.completionCount > 0 ? (
                    <span className="absolute right-1 top-1 rounded bg-background/85 px-1 text-[9px] font-bold text-primary ring-1 ring-border/60">
                      {day.completionCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {selectedDay ? formatDateLabel(selectedDay.date) : "Không có dữ liệu"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedDay?.completionCount ?? 0} lượt hoàn thành
              </p>
            </div>
            {selectedDay?.date === todayDate ? (
              <span className="rounded-md border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-semibold text-primary">
                Hôm nay
              </span>
            ) : null}
          </div>

          {selectedDay && selectedDay.tasks.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {selectedDay.tasks.map((task) => (
                <li
                  key={`${task.id}-${task.submittedAt}`}
                  className="rounded-md border border-border/60 bg-muted/45 px-2.5 py-2"
                >
                  <p className="text-xs font-semibold text-foreground">
                    {task.title}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {TASK_TYPE_LABELS[task.taskType]} · {task.completionCount} lượt
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-border/70 bg-muted/35 px-3 py-5 text-center text-xs text-muted-foreground">
              Chưa có task hoàn thành trong ngày này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="glass-card px-6 py-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-border/55 bg-background text-muted-foreground">
        <Users className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold">{text}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Điều chỉnh lại phạm vi chọn hoặc kiểm tra cấu trúc phụ trách để tiếp tục.
      </p>
    </div>
  );
}
