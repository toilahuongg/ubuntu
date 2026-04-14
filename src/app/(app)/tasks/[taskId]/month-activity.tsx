import { CheckCircle2, Clock } from "lucide-react";

import { formatDateTimeLabel } from "@/lib/dates";
import type { ActivityEntry } from "@/lib/tasks/activity-service";

export function MonthActivity({
  activities,
}: {
  activities: ActivityEntry[];
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Hoạt động trong tháng
      </h2>
      {activities.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có lượt nộp nào trong tháng này.
          </p>
        </div>
      ) : (
        <ol className="glass-card divide-y divide-border overflow-hidden">
          {activities.map((entry) => {
            const submittedLabel = formatDateTimeLabel(
              new Date(entry.submittedAt),
            );
            const byOther =
              !entry.selfSubmitted && entry.actor
                ? ` · ghi nhận bởi ${entry.actor.fullName}`
                : "";

            return (
              <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-foreground/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">
                      {entry.subject.fullName}
                    </span>
                    {entry.completionCount > 1 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (×{entry.completionCount})
                      </span>
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {submittedLabel}
                    </span>
                    {byOther && <span>{byOther}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
