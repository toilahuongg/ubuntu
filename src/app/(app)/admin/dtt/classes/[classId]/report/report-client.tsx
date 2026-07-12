"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

type ReportEntry = {
  userId: string;
  fullName: string;
  role: string;
  taskId: string;
  taskTitle: string;
  isInherited: boolean;
  completed: boolean;
  completionCount: number;
};

type ReportData = {
  className: string;
  date: string;
  entries: ReportEntry[];
  totalStudents: number;
  completedStudents: number;
};

export function ReportClient({
  reportData,
  className: classNameProp,
  classId,
}: {
  reportData: ReportData;
  className: string;
  classId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDate = new Date(reportData.date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = currentDate.getTime() === today.getTime();

  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const formatDateParam = (d: Date) => d.toISOString().split("T")[0];
  const formatDateLabel = (d: Date) =>
    d.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const navigateToDate = (d: Date) => {
    router.push(`/admin/dtt/classes/${classId}/report?date=${formatDateParam(d)}`);
  };

  const canGoNext = !isToday;

  const completionPercent =
    reportData.totalStudents > 0
      ? Math.round((reportData.completedStudents / reportData.totalStudents) * 100)
      : 0;

  // Group entries by user
  const usersMap = new Map<string, ReportEntry[]>();
  for (const entry of reportData.entries) {
    if (!usersMap.has(entry.userId)) usersMap.set(entry.userId, []);
    usersMap.get(entry.userId)!.push(entry);
  }

  // Get unique task columns
  const taskColumns = new Map<string, string>();
  for (const entry of reportData.entries) {
    if (!taskColumns.has(entry.taskId)) {
      taskColumns.set(entry.taskId, entry.taskTitle);
    }
  }

  if (reportData.entries.length === 0) {
    return (
      <div className="space-y-4">
        {/* Back link and date nav */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/dtt"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Về trang quản lý ĐTT
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateToDate(prevDate)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-overlay-subtle"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium min-w-[160px] text-center">
              {formatDateLabel(currentDate)}
            </span>
            <button
              onClick={() => navigateToDate(nextDate)}
              disabled={!canGoNext}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-overlay-subtle disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="glass-card flex flex-col items-center py-12 text-center border border-border/40">
          <p className="text-sm text-muted-foreground">
            Chưa có nhiệm vụ hoặc học viên nào cho ngày này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back link and date nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dtt"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Về trang quản lý ĐTT
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateToDate(prevDate)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-overlay-subtle"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {formatDateLabel(currentDate)}
          </span>
          <button
            onClick={() => navigateToDate(nextDate)}
            disabled={!canGoNext}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-overlay-subtle disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="glass-card flex items-center gap-4 border border-border/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tổng học viên:</span>
          <span className="text-sm font-bold">{reportData.totalStudents}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Hoàn thành:</span>
          <span className="text-sm font-bold text-primary">{reportData.completedStudents}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tỷ lệ:</span>
          <span className="text-sm font-bold">{completionPercent}%</span>
        </div>
      </div>

      {/* Report table */}
      <div className="glass-card overflow-hidden border border-border/40">
        {/* Header row */}
        <div className="flex items-center gap-3 border-b border-border/40 bg-overlay-subtle/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="min-w-[140px]">Học viên</div>
          {Array.from(taskColumns.entries()).map(([id, title]) => (
            <div key={id} className="flex-1 text-center truncate" title={title}>
              {title}
            </div>
          ))}
          <div className="w-24 text-center">Trạng thái</div>
        </div>

        {/* Student rows */}
        {Array.from(usersMap.entries()).map(([userId, entries]) => {
          const allDone = entries.every((e) => e.completed);
          const entryMap = new Map(entries.map((e) => [e.taskId, e]));

          return (
            <div
              key={userId}
              className="flex items-center gap-3 border-b border-border/30 px-4 py-2.5 last:border-b-0 hover:bg-overlay-subtle/20"
            >
              <div className="min-w-[140px]">
                <p className="text-sm font-medium truncate">{entries[0]!.fullName}</p>
                <p className="text-[10px] text-muted-foreground">{entries[0]!.role}</p>
              </div>
              {Array.from(taskColumns.keys()).map((taskId) => {
                const entry = entryMap.get(taskId);
                return (
                  <div key={taskId} className="flex-1 flex justify-center">
                    {entry?.completed ? (
                      <span className="text-lg text-primary">✓</span>
                    ) : (
                      <span className="text-lg text-muted-foreground/30">✗</span>
                    )}
                  </div>
                );
              })}
              <div className="w-24 text-center">
                {allDone ? (
                  <span className="text-xs font-semibold text-primary">Hoàn thành</span>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">Đang làm</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
