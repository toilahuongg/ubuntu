import { Link } from "react-router";
import { Activity, CheckCircle2, Clock } from "lucide-react";

import { formatDateTimeLabel } from "@/lib/dates";
import type { ActivityEntry } from "@/lib/tasks/activity-service";

export function ActivityFeed({ activities }: { activities: ActivityEntry[] }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Activity className="h-4 w-4" />
        Hoạt động gần đây
      </h2>
      {activities.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-8 text-center">
          <Activity className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có hoạt động nào được ghi nhận.
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
              <li
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-overlay-medium"
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "color-mix(in srgb, var(--success-soft) 78%, var(--card) 22%)",
                    color: "color-mix(in srgb, var(--success) 82%, var(--foreground) 18%)",
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">
                      {entry.subject.fullName}
                    </span>{" "}
                    <span className="text-muted-foreground">hoàn thành</span>{" "}
                    <Link
                      to={`/tasks/${entry.taskId}`}
                      className="font-medium underline-offset-2 hover:underline"
                      title={entry.taskTitle}
                    >
                      {entry.taskTitle}
                    </Link>
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
                    {entry.expReward > 0 && (
                      <span
                        className="font-medium"
                        style={{
                          color: "color-mix(in srgb, var(--reward) 82%, var(--foreground) 18%)",
                        }}
                      >
                        +{entry.expReward} XP
                      </span>
                    )}
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
