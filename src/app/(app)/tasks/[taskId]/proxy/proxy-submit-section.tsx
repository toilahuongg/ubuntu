"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, Send, X } from "lucide-react";

import type { SessionUser } from "@/lib/domain";
import { submitTaskAction } from "@/app/(app)/tasks/actions";
import type { TaskStatus } from "@/lib/tasks/types";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_LABELS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

type CalendarCell =
  | { key: string; dateKey: string; day: number }
  | { key: string; dateKey: null; day: null };

function buildCalendar(yearMonth: string): CalendarCell[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const firstDate = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // Monday = 0, Sunday = 6
  const offset = (firstDate.getUTCDay() + 6) % 7;
  const cells: CalendarCell[] = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ key: `pad-${i}`, dateKey: null, day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${yearMonth}-${String(d).padStart(2, "0")}`;
    cells.push({ key: dateKey, dateKey, day: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push({
      key: `pad-end-${cells.length}`,
      dateKey: null,
      day: null,
    });
  }
  return cells;
}

function daysBetween(a: string, b: string) {
  const da = Date.UTC(
    Number(a.slice(0, 4)),
    Number(a.slice(5, 7)) - 1,
    Number(a.slice(8, 10)),
  );
  const db = Date.UTC(
    Number(b.slice(0, 4)),
    Number(b.slice(5, 7)) - 1,
    Number(b.slice(8, 10)),
  );
  return Math.round((da - db) / (24 * 60 * 60 * 1000));
}

export function ProxySubmitSection({
  taskId,
  allowedSubjects,
  selectedSubject,
  selfId,
  status,
  todayKey,
  yearMonth,
  lateWindowDays,
  monthSubmissions,
}: {
  taskId: string;
  allowedSubjects: SessionUser[];
  selectedSubject: SessionUser;
  selfId: string;
  status: TaskStatus;
  todayKey: string;
  yearMonth: string;
  lateWindowDays: number;
  monthSubmissions: Record<string, number>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [count, setCount] = useState<number>(1);

  const cells = useMemo(() => buildCalendar(yearMonth), [yearMonth]);
  const [yearStr, monthStr] = yearMonth.split("-");
  const monthLabel = `${MONTH_LABELS[Number(monthStr) - 1]} ${yearStr}`;
  const isCompleted = status === "COMPLETED";

  function handleSubjectChange(subjectId: string) {
    setError(null);
    setActiveDate(null);
    router.replace(`/tasks/${taskId}/proxy?subject=${subjectId}`);
  }

  function handleSelectDate(dateKey: string) {
    setError(null);
    setActiveDate(dateKey);
    setCount(monthSubmissions[dateKey] ?? 0);
  }

  function handleCancel() {
    setActiveDate(null);
    setCount(0);
    setError(null);
  }

  function handleConfirm() {
    if (!activeDate) return;
    const dateKey = activeDate;
    const amount = Math.max(0, Math.min(100, Math.floor(count) || 0));
    setError(null);
    startTransition(async () => {
      const result = await submitTaskAction(
        taskId,
        selectedSubject.id,
        dateKey,
        amount,
        "set",
      );
      if (result.ok) {
        setActiveDate(null);
        setCount(0);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function cellState(dateKey: string) {
    const delta = daysBetween(todayKey, dateKey); // today - dateKey
    const isFuture = delta < 0;
    const isToday = delta === 0;
    const withinWindow = delta >= 0 && delta <= lateWindowDays;
    const count = monthSubmissions[dateKey] ?? 0;
    return {
      count,
      isFuture,
      isToday,
      clickable: !isFuture && withinWindow && !isCompleted,
    };
  }

  function formatActiveDate(dateKey: string) {
    const [y, m, d] = dateKey.split("-");
    return `${Number(d)}/${Number(m)}/${y}`;
  }

  return (
    <div className="glass-card space-y-4 p-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Nộp cho
        </label>
        <div className="flex items-center gap-2">
          <select
            value={selectedSubject.id}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="form-select flex-1"
          >
            {allowedSubjects.map((user) => (
              <option key={user.id} value={user.id}>
                {user.id === selfId ? `${user.fullName} (tôi)` : user.fullName}
              </option>
            ))}
          </select>
          {allowedSubjects.some((u) => u.id === selfId) && (
            <button
              type="button"
              onClick={() => handleSubjectChange(selfId)}
              disabled={selectedSubject.id === selfId}
              aria-label="Chọn chính tôi"
              className="h-10 shrink-0 rounded-lg border border-border bg-overlay-subtle px-3 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-overlay-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Me
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-sm font-semibold">{monthLabel}</p>

      <div
        className="gap-1"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "0.25rem",
        }}
      >
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          if (cell.dateKey === null) {
            return <div key={cell.key} aria-hidden />;
          }
          const { count: cellCount, isFuture, isToday, clickable } = cellState(
            cell.dateKey,
          );
          const submitted = cellCount > 0;
          const isActive = activeDate === cell.dateKey;
          const base =
            "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-colors disabled:cursor-not-allowed";
          const classes = isActive
            ? `${base} border-primary bg-primary/25 text-primary ring-2 ring-primary/40`
            : submitted
              ? `${base} border-primary/40 bg-primary/15 text-primary hover:bg-primary/20`
              : isToday
                ? `${base} border-primary/60 bg-overlay-subtle text-foreground`
                : clickable
                  ? `${base} border-border bg-overlay-subtle hover:bg-overlay-medium`
                  : `${base} border-border/40 bg-transparent text-muted-foreground/60`;

          return (
            <button
              key={cell.key}
              type="button"
              disabled={!clickable || isPending}
              aria-pressed={isActive}
              aria-label={`Ngày ${cell.day}${submitted ? `, đã nộp ${cellCount} lần` : ""}${isFuture ? ", tương lai" : ""}`}
              onClick={() => handleSelectDate(cell.dateKey as string)}
              className={classes}
            >
              <span className="font-semibold">{cell.day}</span>
              {submitted && (
                <span className="mt-0.5 flex items-center gap-0.5 text-[10px]">
                  <Check className="h-2.5 w-2.5" />
                  {cellCount > 1 ? `×${cellCount}` : ""}
                </span>
              )}
              {isToday && !submitted && !isActive && (
                <span className="mt-0.5 text-[9px] opacity-70">Hôm nay</span>
              )}
            </button>
          );
        })}
      </div>

      {activeDate && (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Ngày đã chọn</p>
              <p className="text-sm font-semibold">
                {formatActiveDate(activeDate)}
                {monthSubmissions[activeDate] ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (đã có {monthSubmissions[activeDate]} lượt)
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Huỷ chọn"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay-subtle hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label
              htmlFor="proxy-count"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Số lần nộp{" "}
              <span className="text-muted-foreground/70">
                (0 = chưa nộp)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(0, c - 1))}
                disabled={count <= 0 || isPending}
                aria-label="Giảm"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-overlay-subtle transition-colors hover:bg-overlay-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                id="proxy-count"
                type="number"
                min={0}
                max={100}
                step={1}
                value={count}
                onChange={(e) => {
                  const v = Number.parseInt(e.target.value, 10);
                  setCount(Number.isFinite(v) && v >= 0 ? Math.min(100, v) : 0);
                }}
                className="h-10 w-full flex-1 rounded-lg border border-border bg-overlay-subtle px-3 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(100, c + 1))}
                disabled={count >= 100 || isPending}
                aria-label="Tăng"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-overlay-subtle transition-colors hover:bg-overlay-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              isPending ||
              isCompleted ||
              count === (monthSubmissions[activeDate] ?? 0)
            }
            aria-busy={isPending}
            className="btn-gradient flex h-11 w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <span
                  aria-hidden
                  className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background"
                />
                Đang lưu…
              </>
            ) : count === 0 ? (
              <>
                <X className="h-4 w-4" aria-hidden />
                Đánh dấu chưa nộp
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden />
                Lưu {count} lần
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm border border-primary/40 bg-primary/15" />
          Đã nộp
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm border border-primary/60 bg-overlay-subtle" />
          Hôm nay
        </span>
        <span>
          Trong {lateWindowDays} ngày gần nhất có thể nhập bù
        </span>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {isCompleted && (
        <p className="text-xs text-muted-foreground">
          Nhiệm vụ đã hoàn thành — không thể nộp thêm.
        </p>
      )}
    </div>
  );
}
