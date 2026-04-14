import Image from "next/image";
import Link from "next/link";
import { Calendar, CheckCircle2, ChevronRight, Clock } from "lucide-react";

import { formatDateLabel } from "@/lib/dates";
import type { ActivityEntry } from "@/lib/tasks/activity-service";
import type { MemberDashboardView } from "@/lib/tasks/types";
import { ActivityFeed } from "./activity-feed";

export function MemberDashboard({
  data,
  activities,
}: {
  data: MemberDashboardView;
  activities: ActivityEntry[];
}) {
  const progressPercent =
    data.nextLevelXp > 0
      ? Math.min(
          100,
          Math.round((data.progressXp / data.nextLevelXp) * 100),
        )
      : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>{formatDateLabel(data.date)}</span>
      </div>

      <div className="glass-card flex items-center gap-4 p-4">
        <Image
          src={data.levelIcon}
          alt={data.levelName}
          width={56}
          height={56}
          className="shrink-0 drop-shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold leading-none">Lv.{data.level}</p>
            <p className="truncate text-xs text-muted-foreground">
              {data.levelName}
            </p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-overlay-subtle">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {data.progressXp.toLocaleString("vi-VN")} /{" "}
            {data.nextLevelXp.toLocaleString("vi-VN")} XP · Tổng{" "}
            {data.totalXp.toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      {data.cards.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Nhiệm vụ hôm nay
          </h2>
          <div className="space-y-2">
            {data.cards.map((card) => (
              <Link
                key={card.id}
                href={`/tasks/${card.id}`}
                className="glass-card card-hover flex items-center justify-between p-4 active:bg-overlay-medium active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <h3
                    className="truncate text-sm font-semibold"
                    title={card.title}
                  >
                    {card.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(card.deadlineAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {card.expReward > 0 && (
                      <span className="font-medium text-foreground/70">
                        +{card.expReward} XP
                      </span>
                    )}
                    {card.myCompletionCount > 0 && (
                      <span className="flex items-center gap-1 text-foreground/70">
                        <CheckCircle2 className="h-3 w-3" />
                        Đã nộp
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="ml-3 h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="glass-card flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có nhiệm vụ nào hôm nay.
          </p>
        </div>
      )}

      <ActivityFeed activities={activities} />
    </div>
  );
}
