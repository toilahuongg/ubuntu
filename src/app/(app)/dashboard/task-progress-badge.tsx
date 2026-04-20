import { CheckCircle2, Target } from "lucide-react";

import type { TaskProgress } from "@/lib/tasks/types";

export function TaskProgressBadge({ progress }: { progress: TaskProgress }) {
  if (progress.isGoalMissing) {
    return (
      <span className="flex items-center gap-1 rounded-md bg-overlay-subtle px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
        <Target className="h-3 w-3" aria-hidden />
        Chưa đặt mục tiêu tháng
      </span>
    );
  }

  if (progress.target === null) return null;

  if (progress.isGoalComplete) {
    return (
      <span className="flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Đã đạt mục tiêu
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-foreground/70">
      <Target className="h-3 w-3" aria-hidden />
      {progress.current}/{progress.target} {progress.unitLabel}
      {progress.kind === "TOTAL" ? "" : " tháng này"}
    </span>
  );
}
