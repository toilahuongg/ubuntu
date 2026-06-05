"use client";

import { Calendar, CheckCircle2, BookOpen } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import type { EquippedView } from "@/lib/cosmetics/serialize";
import { formatDateLabel } from "@/lib/dates";
import { TaskCardSection } from "../dashboard/task-card-sections";
import type { MemberDashboardView, LeaderDashboardView } from "@/lib/tasks/types";

export function PrayerDashboardClient({
  data,
  user,
  userId,
  equipped,
  isLeader,
}: {
  data: MemberDashboardView | LeaderDashboardView;
  user: Pick<SessionUser, "fullName" | "role">;
  userId: string;
  equipped?: EquippedView | null;
  isLeader: boolean;
}) {
  const prayerCards = data.cards; // already filtered to COUNT_TOTAL by service

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="inline-flex items-center gap-2 rounded-full bg-overlay-subtle px-3 py-1 shadow-sm ring-1 ring-border">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{formatDateLabel(data.date)}</span>
        </div>
        <h1 className="font-display text-lg font-bold text-foreground">Cầu Nguyện</h1>
      </div>

      {/* Daily Scripture */}
      {data.dailyScripture && (
        <div className="glass-card relative overflow-hidden p-5 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="absolute top-3 right-3 text-primary/10">
            <BookOpen className="h-16 w-16" />
          </div>
          <p className="font-serif text-sm italic text-foreground/90 leading-relaxed">
            "{data.dailyScripture.fullText}"
          </p>
          <p className="mt-2 text-xs font-semibold text-primary">
            — {data.dailyScripture.reference}
          </p>
        </div>
      )}

      {/* Task Card Section */}
      <TaskCardSection
        title="Nhiệm vụ Cầu Nguyện"
        cards={prayerCards}
        userId={userId}
        variant={isLeader ? "leader" : "member"}
      />

      {prayerCards.length === 0 && (
        <div className="glass-card flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có nhiệm vụ cầu nguyện nào được phân công.
          </p>
        </div>
      )}
    </div>
  );
}
