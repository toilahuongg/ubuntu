import { redirect } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import { getCurrentYearMonth, getTodayDateKey } from "@/lib/dates";
import { canProxySubmit } from "@/lib/permissions";
import {
  getTaskDetail,
  listSubjectMonthSubmissions,
} from "@/lib/tasks/task-service";
import { ProxySubmitSection } from "app/(app)/tasks/[taskId]/proxy/proxy-submit-section";

export async function ServerComponent({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");

  const { taskId } = await params;
  const { subject } = await searchParams;
  const dateKey = getTodayDateKey();
  const yearMonth = getCurrentYearMonth();

  const bootstrap = await getTaskDetail(session, taskId, dateKey, subject);

  const self = bootstrap.rosterMembers.find((m) => m.id === session.id);
  const others = bootstrap.rosterMembers.filter(
    (m) => m.id !== session.id && canProxySubmit(session, m),
  );
  const allowedSubjects = self ? [self, ...others] : others;

  if (allowedSubjects.length === 0) {
    throw redirect(`/tasks/${taskId}`);
  }

  const selectedId =
    subject && allowedSubjects.some((m) => m.id === subject)
      ? subject
      : allowedSubjects[0].id;

  const detail =
    bootstrap.selectedSubject.id === selectedId
      ? bootstrap
      : await getTaskDetail(session, taskId, dateKey, selectedId);

  const monthSubmissions = await listSubjectMonthSubmissions(
    taskId,
    selectedId,
    yearMonth,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div>
        <Link
          to={`/tasks/${taskId}`}
          className="mb-3 -ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-overlay-subtle hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại nhiệm vụ
        </Link>
        <h1 className="font-display text-xl font-bold">Nhập hộ</h1>
        <p className="mt-1 text-sm text-muted-foreground">{detail.title}</p>
      </div>

      <ProxySubmitSection
        taskId={detail.id}
        allowedSubjects={allowedSubjects}
        selectedSubject={detail.selectedSubject}
        selfId={session.id}
        status={detail.status}
        todayKey={dateKey}
        yearMonth={yearMonth}
        lateWindowDays={detail.lateWindowDays}
        monthSubmissions={monthSubmissions}
        taskType={detail.taskType}
      />
    </div>
  );
}
