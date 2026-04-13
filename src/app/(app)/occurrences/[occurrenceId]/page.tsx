import Link from "next/link";

import { saveSubmissionAction } from "@/app/(app)/actions";
import { NoticeBanner } from "@/components/notice-banner";
import { SubmissionEditor } from "@/components/submission-editor";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/current-user";
import { formatDateLabel, formatTimeLabel } from "@/lib/dates";
import { getOccurrenceDetail } from "@/lib/services/task-service";

type OccurrencePageProps = {
  params: Promise<{ occurrenceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OccurrencePage({
  params,
  searchParams,
}: OccurrencePageProps) {
  const user = await requireCurrentUser();
  const [{ occurrenceId }, query] = await Promise.all([params, searchParams]);
  const selectedSubjectId =
    typeof query.subject === "string" ? query.subject : undefined;
  const detail = await getOccurrenceDetail(user, occurrenceId, selectedSubjectId);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <NoticeBanner
          tone="error"
          message={typeof query.error === "string" ? query.error : undefined}
        />
        <NoticeBanner
          tone="success"
          message={typeof query.success === "string" ? query.success : undefined}
        />

        <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
                  {formatDateLabel(detail.date)}
                </p>
                <CardTitle className="mt-2 text-3xl">{detail.title}</CardTitle>
              </div>
              <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                Ve dashboard
              </Link>
            </div>
            <p className="text-sm leading-7 text-slate-600">{detail.description}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Deadline {formatTimeLabel(new Date(detail.deadlineAt))}
            </p>
          </CardHeader>
          <CardContent>
            <SubmissionEditor
              action={saveSubmissionAction}
              allowedSubjects={detail.allowedSubjects}
              formSchema={detail.formSchema}
              occurrenceId={detail.id}
              selectedSubject={detail.selectedSubject}
              values={detail.selectedSubmission?.values}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/70 bg-white/90 shadow-[0_20px_80px_rgba(39,61,51,0.06)]">
        <CardHeader>
          <CardTitle>Tien do toan nhom</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.roster.map((member) => (
            <Link
              key={member.id}
              href={`/occurrences/${detail.id}?subject=${member.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-emerald-300 hover:bg-emerald-50/60"
            >
              <div>
                <p className="font-medium text-slate-900">{member.fullName}</p>
                <p className="text-xs text-slate-500">{member.role}</p>
              </div>
              <span
                className={
                  member.submitted
                    ? "rounded-full bg-emerald-700 px-3 py-1 text-xs text-white"
                    : "rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900"
                }
              >
                {member.submitted ? "Da nop" : "Chua nop"}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
