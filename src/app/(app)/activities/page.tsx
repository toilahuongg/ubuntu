import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, CheckCircle2, Clock } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { formatDateTimeLabel } from "@/lib/dates";
import { listRecentActivities } from "@/lib/tasks/activity-service";

export default async function ActivitiesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const activities = await listRecentActivities(session, 80);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-foreground/80" />
        <h1 className="font-display text-xl font-bold">Hoạt động nhóm</h1>
      </div>

      {activities.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-12 text-center">
          <Activity className="mb-3 h-10 w-10 text-muted-foreground/40" />
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
                className="flex items-start gap-3 px-4 py-3"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-foreground/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">
                      {entry.subject.fullName}
                    </span>{" "}
                    <span className="text-muted-foreground">hoàn thành</span>{" "}
                    <Link
                      href={`/tasks/${entry.taskId}`}
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
                      <span className="font-medium text-foreground/70">
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
    </div>
  );
}
