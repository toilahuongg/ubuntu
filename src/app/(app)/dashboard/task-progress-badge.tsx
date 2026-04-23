import { CheckCircle2, Target } from "lucide-react";

import type { TaskProgress } from "@/lib/tasks/types";

export function TaskProgressBadge({ progress }: { progress: TaskProgress }) {
  if (progress.isGoalMissing) {
    return (
      <span
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{
          background: "var(--warning-soft)",
          color: "color-mix(in srgb, var(--warning) 82%, var(--foreground) 18%)",
        }}
      >
        <Target className="h-3 w-3" aria-hidden />
        Chưa đặt mục tiêu tháng
      </span>
    );
  }

  if (progress.target === null) return null;

  if (progress.isGoalComplete) {
    return (
      <span
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{
          background: "var(--success-soft)",
          color: "color-mix(in srgb, var(--success) 82%, var(--foreground) 18%)",
        }}
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Đã đạt mục tiêu
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        background: "color-mix(in srgb, var(--accent) 88%, var(--card) 12%)",
        color: "color-mix(in srgb, var(--primary) 82%, var(--foreground) 18%)",
      }}
    >
      <Target className="h-3 w-3" aria-hidden />
      {progress.current}/{progress.target} {progress.unitLabel}
      {progress.kind === "TOTAL" ? "" : " tháng này"}
    </span>
  );
}
