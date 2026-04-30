"use client";

import { useMemo, useState } from "react";

import type { TaskActivityRow } from "@/lib/services/analytics-service";

type DaySummary = {
  date: string;
  taskCompletions: Array<{ count: number; taskId: string; title: string }>;
  tasksDone: number;
  totalCompletions: number;
};

type HeatLevel = {
  color: string;
  label: string;
  legendLabel: string;
};

const HEAT_LEVELS: Array<{
  color: string;
  label: string;
  legendLabel: string;
  max: number;
}> = [
  { color: "#e2e8f0", label: "0 nhiệm vụ", legendLabel: "0", max: 0 },
  { color: "#fed7aa", label: "1 nhiệm vụ", legendLabel: "1", max: 1 },
  { color: "#fdba74", label: "2 nhiệm vụ", legendLabel: "2", max: 2 },
  { color: "#fb923c", label: "3 nhiệm vụ", legendLabel: "3", max: 3 },
  { color: "#f97316", label: "4 nhiệm vụ", legendLabel: "4", max: 4 },
  { color: "#ea580c", label: "5 nhiệm vụ", legendLabel: "5", max: 5 },
  { color: "#c2410c", label: "6+ nhiệm vụ", legendLabel: "6+", max: Infinity },
];

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateLabel(dateKey: string) {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    weekday: "long",
  }).format(date);
}

function getHeatLevel(tasksDone: number): HeatLevel {
  return (
    HEAT_LEVELS.find((level) => tasksDone <= level.max) ?? HEAT_LEVELS[HEAT_LEVELS.length - 1]
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

export function TaskActivityCalendar({
  rows,
  startDate,
  endDate,
}: {
  endDate: string;
  rows: TaskActivityRow[];
  startDate: string;
}) {
  const summaries = useMemo(() => {
    const summaryByDate = new Map<string, DaySummary>();

    for (const row of rows) {
      for (const cell of row.cells) {
        if (!summaryByDate.has(cell.date)) {
          summaryByDate.set(cell.date, {
            date: cell.date,
            taskCompletions: [],
            tasksDone: 0,
            totalCompletions: 0,
          });
        }

        if (cell.completionCount > 0) {
          const summary = summaryByDate.get(cell.date)!;
          summary.tasksDone += 1;
          summary.totalCompletions += cell.completionCount;
          summary.taskCompletions.push({
            count: cell.completionCount,
            taskId: row.id,
            title: row.title,
          });
        }
      }
    }

    return { summaryByDate };
  }, [rows]);

  const [selectedDate, setSelectedDate] = useState(endDate);

  const rangeStart = parseDateKey(startDate);
  const rangeEnd = parseDateKey(endDate);
  const calendarStart = shiftDate(rangeStart, -rangeStart.getUTCDay());
  const calendarEnd = shiftDate(rangeEnd, 6 - rangeEnd.getUTCDay());

  const days: Date[] = [];
  for (
    let date = calendarStart;
    date.getTime() <= calendarEnd.getTime();
    date = shiftDate(date, 1)
  ) {
    days.push(date);
  }

  const selectedSummary = summaries.summaryByDate.get(selectedDate);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-300/70 bg-white p-3 text-slate-900 shadow-sm sm:space-y-4 sm:rounded-3xl sm:p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase tracking-wide text-slate-600 sm:gap-2 sm:text-[10px]">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2 text-[11px] text-slate-700 sm:gap-2.5">
            {HEAT_LEVELS.map((item) => (
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
          nhiệm vụ hoàn thành/ngày
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((date) => {
          const dateKey = toDateKey(date);
          const inRange = dateKey >= startDate && dateKey <= endDate;
          const isSelected = dateKey === selectedDate;
          const isToday = dateKey === endDate && inRange;
          const daySummary = summaries.summaryByDate.get(dateKey);
          const tasksDone = daySummary?.tasksDone ?? 0;
          const heat = getHeatLevel(tasksDone);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => {
                if (!inRange) return;
                setSelectedDate(dateKey);
              }}
              disabled={!inRange}
              className="relative aspect-square rounded-lg border border-slate-300 pb-1 pr-1 text-[11px] transition-colors duration-150 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed sm:rounded-xl sm:text-xs"
              style={{
                backgroundColor:
                  tasksDone > 0
                    ? heat.color
                    : inRange
                      ? "#f1f5f9"
                    : "#f8fafc",
                boxShadow: getDayCellShadow({ isSelected, isToday }),
                color: inRange ? "#0f172a" : "#94a3b8",
              }}
              title={`${isToday ? "Hôm nay - " : ""}${formatDateLabel(dateKey)}: ${tasksDone} nhiệm vụ hoàn thành (${heat.label})`}
              aria-label={`${isToday ? "Hôm nay - " : ""}${formatDateLabel(dateKey)}: ${tasksDone} nhiệm vụ hoàn thành (${heat.label})`}
              >
              <span className="absolute left-1.5 top-1 text-[10px] font-medium sm:left-2.5 sm:top-2 sm:text-[11px]">
                {date.getUTCDate()}
              </span>
              {isToday ? (
                <span
                  className="absolute bottom-1 left-1.5 h-1.5 w-1.5 rounded-full bg-orange-700 ring-1 ring-white sm:bottom-1.5 sm:left-2.5"
                  aria-hidden="true"
                />
              ) : null}
              {tasksDone > 0 ? (
                <span className="absolute right-1 top-1 hidden min-w-[1.1rem] rounded-full bg-white px-1 text-center text-[9px] font-bold leading-3.5 text-orange-700 ring-1 ring-orange-300 sm:inline-flex sm:right-1.5 sm:top-1.5 sm:min-w-[1.2rem] sm:px-1.5 sm:text-[10px] sm:leading-4">
                  {tasksDone}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-bold text-slate-800 sm:text-sm">
            {formatDateLabel(selectedDate)}
          </p>
          {selectedDate === endDate ? (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-orange-200">
              Hôm nay
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {selectedSummary?.tasksDone ?? 0} nhiệm vụ,{" "}
          {selectedSummary?.totalCompletions ?? 0} lượt hoàn thành
        </p>

        {selectedSummary && selectedSummary.taskCompletions.length > 0 ? (
          <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
            {selectedSummary.taskCompletions.map((task) => (
              <li
                key={`${selectedDate}:${task.taskId}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 sm:gap-3 sm:px-2.5"
              >
                <span className="truncate">{task.title}</span>
                <span className="shrink-0 text-[11px] font-semibold text-orange-700">
                  {task.count} lượt
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            Không có nhiệm vụ hoàn thành trong ngày này.
          </p>
        )}
      </div>
    </div>
  );
}
