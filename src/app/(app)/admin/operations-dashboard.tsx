"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Users,
} from "lucide-react";

import { TASK_TYPE_LABELS } from "@/lib/tasks/constants";
import type {
  AdminOperationsCompletionDay,
  AdminOperationsPeriod,
  AdminOperationsView,
} from "@/lib/services/admin-operations-types";

type OperationsDashboardProps = {
  data: AdminOperationsView;
};

const PERIODS: Array<{
  key: AdminOperationsPeriod;
  label: string;
  shortLabel: string;
}> = [
  { key: "day", label: "Hôm nay", shortLabel: "Ngày" },
  { key: "week", label: "Tuần này", shortLabel: "Tuần" },
  { key: "month", label: "Tháng này", shortLabel: "Tháng" },
];

const STATUS_LABELS: Record<
  AdminOperationsView["members"][number]["status"],
  string
> = {
  complete: "Hoàn thành",
  idle: "Không có task",
  in_progress: "Đang làm",
  needs_attention: "Cần chú ý",
};

const COMPLETION_HEAT_LEVELS: Array<{
  color: string;
  label: string;
  legendLabel: string;
  max: number;
}> = [
  { color: "#e2e8f0", label: "0 task", legendLabel: "0", max: 0 },
  { color: "#fed7aa", label: "1 task", legendLabel: "1", max: 1 },
  { color: "#fdba74", label: "2 task", legendLabel: "2", max: 2 },
  { color: "#fb923c", label: "3 task", legendLabel: "3", max: 3 },
  { color: "#f97316", label: "4 task", legendLabel: "4", max: 4 },
  { color: "#ea580c", label: "5 task", legendLabel: "5", max: 5 },
  { color: "#c2410c", label: "6+ task", legendLabel: "6+", max: Infinity },
];

export function OperationsDashboard({ data }: OperationsDashboardProps) {
  const [period, setPeriod] = useState<AdminOperationsPeriod>("day");
  const activeSummary = data.periods[period];
  const editHref = getScopeEditHref(data.scope.role);

  return (
    <div className="space-y-5">
      <section className="glass-card overflow-hidden p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
              <BarChart3 className="h-3.5 w-3.5" />
              {data.scope.roleLabel}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate font-display text-2xl font-bold">
                {data.scope.name}
              </h1>
              {editHref && (
                <Link
                  href={editHref}
                  aria-label={`Chỉnh sửa ${data.scope.name}`}
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-overlay-subtle text-muted-foreground ring-1 ring-border transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.scope.memberCount} thành viên trong phạm vi quản lý.
            </p>
          </div>
          <ProgressRing value={data.periods.day.completionPercent} />
        </div>

        <PeriodTabs active={period} onChange={setPeriod} />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricCard label="Đã giao" value={activeSummary.assigned} />
          <MetricCard label="Đã xong" value={activeSummary.completed} />
          <MetricCard label="Còn thiếu" value={activeSummary.pending} tone="warn" />
        </div>
      </section>

      <MemberProgressPanel data={data} period={period} />
    </div>
  );
}

function getScopeEditHref(role: AdminOperationsView["scope"]["role"]) {
  if (role === "TEAM_LEAD") return "/admin/teams";
  if (role === "ZONE_LEAD") return "/admin/zones";
  if (role === "REGIONAL_LEAD") return "/admin/regions";
  return null;
}

function ProgressRing({ value }: { value: number }) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className="flex aspect-square h-20 min-h-20 w-20 min-w-20 shrink-0 items-center justify-center rounded-full p-1.5 shadow-sm ring-1 ring-border"
      style={{
        background: `conic-gradient(var(--primary) ${normalizedValue}%, color-mix(in srgb, var(--border) 72%, var(--card)) 0)`,
      }}
      aria-label={`Hoàn thành hôm nay ${normalizedValue}%`}
      role="img"
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-background text-center shadow-sm ring-1 ring-border">
        <p className="m-0 text-lg font-bold leading-none">{normalizedValue}%</p>
        <p className="m-0 mt-0.5 text-[10px] leading-none text-muted-foreground">
          hôm nay
        </p>
      </div>
    </div>
  );
}

function PeriodTabs({
  active,
  onChange,
}: {
  active: AdminOperationsPeriod;
  onChange: (period: AdminOperationsPeriod) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 rounded-2xl bg-overlay-subtle p-1 ring-1 ring-border">
      {PERIODS.map((period) => (
        <button
          key={period.key}
          type="button"
          onClick={() => onChange(period.key)}
          className={`cursor-pointer rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
            active === period.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-2xl bg-overlay-subtle p-3 ring-1 ring-border">
      <p
        className={`text-lg font-bold leading-none ${
          tone === "warn" && value > 0 ? "text-amber-700" : ""
        }`}
      >
        {value.toLocaleString("vi-VN")}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function MemberProgressPanel({
  data,
  period,
}: {
  data: AdminOperationsView;
  period: AdminOperationsPeriod;
}) {
  const [openMemberId, setOpenMemberId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const periodLabel = PERIODS.find((entry) => entry.key === period)?.shortLabel;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-4 w-4" />
          Tiến độ thành viên
        </h2>
        <span className="rounded-full bg-overlay-subtle px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
          {periodLabel}
        </span>
      </div>

      {data.members.length === 0 ? (
        <EmptyCard text="Chưa có thành viên trong phạm vi này." />
      ) : (
        <div className="glass-card space-y-2 p-2">
          {data.members.map((member) => {
            const summary = member.periods[period];
            const status = resolveMemberStatus(summary);
            const isOpen = member.id === openMemberId;
            return (
              <div
                key={member.id}
                className="overflow-hidden rounded-2xl bg-overlay-subtle ring-1 ring-border"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenMemberId(isOpen ? "" : member.id);
                    setSelectedDate(member.completions[period][0]?.date ?? "");
                  }}
                  className="group flex min-h-24 w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-overlay-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {member.fullName}
                      </p>
                      <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {member.roleLabel}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-overlay-subtle">
                      <div
                        className={`h-full rounded-full ${
                          status === "needs_attention"
                            ? "bg-amber-500"
                            : "bg-primary"
                        }`}
                        style={{ width: `${summary.completionPercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {summary.completed}/{summary.assigned} task slot hoàn thành
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-right">
                    <div>
                      <p className="text-sm font-bold">
                        {summary.completionPercent}%
                      </p>
                      <StatusBadge status={status} />
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <MemberCompletionDetails
                    days={member.completions[period]}
                    period={period}
                    selectedDate={selectedDate}
                    todayDate={member.completions.day[0]?.date ?? ""}
                    onSelectDate={setSelectedDate}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MemberCompletionDetails({
  days,
  period,
  selectedDate,
  todayDate,
  onSelectDate,
}: {
  days: AdminOperationsCompletionDay[];
  period: AdminOperationsPeriod;
  selectedDate: string;
  todayDate: string;
  onSelectDate: (date: string) => void;
}) {
  const selectedDay =
    days.find((day) => day.date === selectedDate) ??
    days.find((day) => day.tasks.length > 0) ??
    days[0];

  return (
    <div className="space-y-3 border-t border-border bg-background/75 px-3 pb-3 pt-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Task hoàn thành theo{" "}
          {period === "day" ? "ngày" : period === "week" ? "tuần" : "tháng"}
        </div>
        <span className="rounded-full bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
          {days.reduce((total, day) => total + day.completionCount, 0)} lượt
        </span>
      </div>

      {!selectedDay ? (
        <div className="rounded-2xl border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
          Không có dữ liệu trong khoảng thời gian này.
        </div>
      ) : period === "day" ? (
        <CompletedTaskList day={selectedDay} isToday={selectedDay.date === todayDate} />
      ) : (
        <>
          <CompletionCalendar
            days={days}
            period={period}
            selectedDate={selectedDay?.date ?? ""}
            todayDate={todayDate}
            onSelectDate={onSelectDate}
          />
          <CompletedTaskList day={selectedDay} isToday={selectedDay.date === todayDate} />
        </>
      )}
    </div>
  );
}

function CompletionCalendar({
  days,
  period,
  selectedDate,
  todayDate,
  onSelectDate,
}: {
  days: AdminOperationsCompletionDay[];
  period: Exclude<AdminOperationsPeriod, "day">;
  selectedDate: string;
  todayDate: string;
  onSelectDate: (date: string) => void;
}) {
  const blanks =
    period === "month" && days[0] ? getIsoWeekday(days[0].date) - 1 : 0;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-300/70 bg-white p-3 text-slate-900 shadow-sm sm:rounded-3xl sm:p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase tracking-wide text-slate-600 sm:gap-2 sm:text-[10px]">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2 text-[11px] text-slate-700 sm:gap-2.5">
            {COMPLETION_HEAT_LEVELS.map((item) => (
              <span
                key={item.label}
                className="inline-flex shrink-0 items-center gap-1.5"
              >
                <span
                  className="h-3 w-3 rounded-[4px] ring-1 ring-slate-300"
                  style={{ backgroundColor: item.color }}
                />
                {item.legendLabel}
              </span>
            ))}
          </div>
        </div>
        <span className="block text-[11px] text-slate-500">
          task hoàn thành/ngày
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: blanks }).map((_, index) => (
          <div key={`blank-${index}`} className="aspect-square" aria-hidden="true" />
        ))}
        {days.map((day) => {
          const hasTasks = day.tasks.length > 0;
          const isSelected = day.date === selectedDate;
          const isToday = day.date === todayDate;
          const heat = getCompletionHeatLevel(day.tasks.length);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className="relative aspect-square cursor-pointer rounded-lg border border-slate-300 pb-1 pr-1 text-[11px] transition-colors duration-150 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:rounded-xl sm:text-xs"
              style={{
                backgroundColor: hasTasks ? heat.color : "#f1f5f9",
                boxShadow: getDayCellShadow({ isSelected, isToday }),
                color: "#0f172a",
              }}
              title={`${isToday ? "Hôm nay - " : ""}${formatDateLabel(day.date)}: ${day.tasks.length} task hoàn thành (${heat.label})`}
              aria-label={`${isToday ? "Hôm nay - " : ""}${formatDateLabel(day.date)}: ${day.tasks.length} task hoàn thành (${heat.label})`}
            >
              <span className="absolute left-1.5 top-1 text-[10px] font-medium sm:left-2.5 sm:top-2 sm:text-[11px]">
                {getDayOfMonth(day.date)}
              </span>
              {isToday && (
                <span
                  className="absolute bottom-1 left-1.5 h-1.5 w-1.5 rounded-full bg-orange-700 ring-1 ring-white sm:bottom-1.5 sm:left-2.5"
                  aria-hidden="true"
                />
              )}
              {hasTasks && (
                <span className="absolute right-1 top-1 hidden min-w-[1.1rem] rounded-full bg-white px-1 text-center text-[9px] font-bold leading-3.5 text-orange-700 ring-1 ring-orange-300 sm:inline-flex sm:right-1.5 sm:top-1.5 sm:min-w-[1.2rem] sm:px-1.5 sm:text-[10px] sm:leading-4">
                  {day.tasks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompletedTaskList({
  day,
  isToday,
}: {
  day: AdminOperationsCompletionDay;
  isToday: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3 text-slate-900 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-bold text-slate-800 sm:text-sm">
              {formatDateLabel(day.date)}
            </p>
            {isToday && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-orange-200">
                Hôm nay
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {day.tasks.length} task, {day.completionCount} lượt hoàn thành
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
          {getWeekdayLabel(day.date)}
        </span>
      </div>

      {day.tasks.length > 0 ? (
        <ul className="space-y-1.5 text-xs text-slate-700">
          {day.tasks.map((task) => (
            <li
              key={`${day.date}-${task.id}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 sm:gap-3 sm:px-2.5"
            >
              <span className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-700" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">
                    {task.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {TASK_TYPE_LABELS[task.taskType]} · {formatTime(task.submittedAt)}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-orange-700">
                {task.completionCount} lượt
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Chưa có task hoàn thành trong ngày này.
        </p>
      )}
    </div>
  );
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`);
}

function getIsoWeekday(dateKey: string) {
  const day = parseDateKey(dateKey).getUTCDay();
  return day === 0 ? 7 : day;
}

function getDayOfMonth(dateKey: string) {
  return parseDateKey(dateKey).getUTCDate();
}

function getWeekdayLabel(dateKey: string) {
  const weekday = getIsoWeekday(dateKey);
  return weekday === 7 ? "CN" : `T${weekday + 1}`;
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    weekday: "long",
  }).format(parseDateKey(dateKey));
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCompletionHeatLevel(tasksDone: number) {
  return (
    COMPLETION_HEAT_LEVELS.find((level) => tasksDone <= level.max) ??
    COMPLETION_HEAT_LEVELS[COMPLETION_HEAT_LEVELS.length - 1]
  );
}

function getDayCellShadow({
  isSelected,
  isToday,
}: {
  isSelected: boolean;
  isToday: boolean;
}) {
  const shadows: string[] = [];
  if (isToday) shadows.push("0 0 0 2px rgba(249,115,22,0.95)");
  if (isSelected) shadows.push("inset 0 0 0 2px rgba(71,85,105,0.95)");
  return shadows.length > 0 ? shadows.join(", ") : undefined;
}

function resolveMemberStatus(summary: AdminOperationsView["periods"]["day"]) {
  if (summary.assigned === 0) return "idle" as const;
  if (summary.pending > 0) return "needs_attention" as const;
  if (summary.completionPercent === 100) return "complete" as const;
  return "in_progress" as const;
}

function StatusBadge({
  status,
}: {
  status: AdminOperationsView["members"][number]["status"];
}) {
  const isAttention = status === "needs_attention";
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isAttention
          ? "bg-amber-100 text-amber-800"
          : "bg-overlay-subtle text-muted-foreground"
      }`}
    >
      {isAttention && <AlertTriangle className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="glass-card flex flex-col items-center py-8 text-center">
      <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
