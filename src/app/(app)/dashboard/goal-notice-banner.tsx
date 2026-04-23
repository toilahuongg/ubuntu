import Link from "next/link";
import { ChevronRight, Target } from "lucide-react";

import type { DashboardGoalNotice } from "@/lib/tasks/types";

export function GoalNoticeBanner({
  notice,
}: {
  notice: DashboardGoalNotice | null;
}) {
  if (!notice || notice.tasks.length === 0) return null;

  const [firstTask] = notice.tasks;
  const visibleTasks = notice.tasks.slice(0, 3);
  const hiddenCount = Math.max(notice.missingCount - visibleTasks.length, 0);

  return (
    <section
      className="glass-card space-y-3 p-4"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--warning-soft) 56%, var(--card) 44%) 0%, color-mix(in srgb, var(--overlay-subtle) 92%, var(--card) 8%) 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "var(--warning-soft)",
              color: "color-mix(in srgb, var(--warning) 82%, var(--foreground) 18%)",
            }}
          >
            <Target className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              Bạn còn {notice.missingCount} nhiệm vụ chưa đặt mục tiêu tháng
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Đặt mục tiêu để dashboard theo dõi tiến độ tháng chính xác hơn.
            </p>
          </div>
        </div>
        <Link
          href={`/tasks/${firstTask.id}`}
          className="btn-gradient inline-flex h-9 shrink-0 items-center gap-1 px-3 text-xs font-semibold"
        >
          Đặt ngay
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTasks.map((task) => (
          <Link
            key={task.id}
            href={`/tasks/${task.id}`}
            className="max-w-full truncate rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors hover:text-foreground"
            style={{
              background: "color-mix(in srgb, var(--overlay-subtle) 84%, var(--card) 16%)",
              color: "var(--muted-foreground)",
            }}
          >
            {task.title}
          </Link>
        ))}
        {hiddenCount > 0 && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: "color-mix(in srgb, var(--overlay-subtle) 84%, var(--card) 16%)",
              color: "var(--muted-foreground)",
            }}
          >
            +{hiddenCount}
          </span>
        )}
      </div>
    </section>
  );
}
