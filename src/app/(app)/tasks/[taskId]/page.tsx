import { redirect } from "next/navigation";
import { ArrowLeft, Clock, Zap } from "lucide-react";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { getTaskDetail } from "@/lib/tasks/task-service";
import { getTodayDateKey } from "@/lib/dates";
import { ROLE_LABELS } from "@/lib/domain";
import { SubmitSection } from "./submit-section";

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const { taskId } = await params;
  const { subject } = await searchParams;
  const dateKey = getTodayDateKey();

  const detail = await getTaskDetail(session, taskId, dateKey, subject);

  const deadlineTime = new Date(detail.deadlineAt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel =
    detail.status === "OPEN" ? "Đang mở" : "Đã khoá";

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div>
        <Link
          href="/dashboard"
          className="mb-3 -ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-overlay-subtle hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
        <h1 className="font-display text-xl font-bold">{detail.title}</h1>
        {detail.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Hạn: {deadlineTime}
          </span>
          {detail.expReward > 0 && (
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              +{detail.expReward} XP
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              detail.status === "OPEN"
                ? "bg-overlay-medium text-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <SubmitSection
        taskId={detail.id}
        allowedSubjects={detail.rosterMembers}
        selectedSubject={detail.selectedSubject}
        myCompletionCount={detail.myCompletionCount}
        status={detail.status}
      />

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Bảng hoàn thành
        </h2>
        <div className="glass-card divide-y divide-border overflow-hidden">
          {detail.roster.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.fullName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {ROLE_LABELS[member.role] ?? member.role}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {member.completionCount > 0 ? (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-overlay-medium px-2 text-xs font-bold">
                    {member.completionCount}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
