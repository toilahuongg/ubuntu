import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  ListTodoIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { NoticeBanner } from "@/components/notice-banner";
import { RoleBadge } from "@/components/role-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/current-user";
import { formatDateLabel, formatTimeLabel, getTodayDateKey } from "@/lib/dates";
import { generateOccurrencesForDate, getDashboardData } from "@/lib/services/task-service";
import { cn } from "@/lib/utils";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await requireCurrentUser();
  const dateKey = getTodayDateKey();

  if (user.role !== "ADMIN") {
    await generateOccurrencesForDate(dateKey);
  }

  const [dashboard, query] = await Promise.all([
    getDashboardData(user, dateKey),
    searchParams,
  ]);
  const scopeLabel = user.role === "TEAM_LEAD"
    ? "toan nhom"
    : user.role === "REGIONAL_LEAD"
      ? "khu vuc phu trach"
      : user.role === "ADMIN"
        ? "toan he thong"
        : "ca nhan";

  return (
    <div className="space-y-6">
      <NoticeBanner
        tone="error"
        message={typeof query.error === "string" ? query.error : undefined}
      />
      <NoticeBanner
        tone="success"
        message={typeof query.success === "string" ? query.success : undefined}
      />

      <section className="section-shell overflow-hidden p-6 md:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-indigo-700">
              Van hanh hom nay
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              {formatDateLabel(dashboard.date)}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <RoleBadge role={user.role} />
              <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-sm text-slate-600">
                Ban dang thao tac voi pham vi {scopeLabel}
              </span>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Uu tien xu ly cac submission dang treo truoc deadline, sau do xem nhanh muc chi tiet ben duoi de can thiep theo thanh vien hoac template.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-[26px] border border-indigo-100 bg-[linear-gradient(180deg,rgba(99,102,241,0.08),rgba(255,255,255,0.95))] p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-indigo-700">
                Completion
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {dashboard.highlights.completionPercent}%
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {dashboard.highlights.completed} submission da xong, {dashboard.highlights.pending} muc dang treo.
              </p>
            </div>
            <div className="rounded-[26px] border border-slate-200 bg-white/80 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-slate-500">
                Lua chon nhanh
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {user.role === "TEAM_LEAD" ? (
                  <Link
                    href="/templates"
                    className={cn(buttonVariants({ size: "lg" }), "justify-between")}
                  >
                    Quan ly template
                    <ArrowRightIcon />
                  </Link>
                ) : null}
                {user.role === "ADMIN" ? (
                  <Link
                    href="/admin"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-between")}
                  >
                    Mo quan tri
                    <ArrowRightIcon />
                  </Link>
                ) : null}
                {user.role === "MEMBER" || user.role === "REGIONAL_LEAD" ? (
                  <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Mo the task ben duoi de cap nhat ket qua ngay.
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Nguoi trong pham vi"
          icon={UsersIcon}
          tone="primary"
          value={dashboard.highlights.visibleUsers}
          description="Tong so nguoi dung ban dang theo doi o dashboard nay."
        />
        <MetricCard
          label="Da hoan thanh"
          icon={TargetIcon}
          tone="success"
          value={dashboard.highlights.completed}
          description="Tong so submission da co cho ngay hom nay."
        />
        <MetricCard
          label="Con treo"
          icon={CircleAlertIcon}
          tone="warning"
          value={dashboard.highlights.pending}
          description="So luot cap nhat con thieu trong pham vi hien tai."
        />
        <MetricCard
          label="Ti le hoan tat"
          icon={ListTodoIcon}
          tone="neutral"
          value={`${dashboard.highlights.completionPercent}%`}
          description="Ti le cap nhat da nop tren tong slot can co."
        />
      </div>

      {user.role !== "ADMIN" ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="border-b border-slate-200/70">
              <CardTitle>Nhiem vu trong ngay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.cards.length ? (
                dashboard.cards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,252,0.96))] p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">{card.title}</p>
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                            {card.completionCount}/{card.totalCount}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                            <CalendarClockIcon className="size-3.5" />
                            {formatTimeLabel(new Date(card.deadlineAt))}
                          </span>
                        </div>
                        <p className="text-sm leading-7 text-slate-600">{card.description}</p>
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">
                          Occurrence dang theo doi trong ngay
                        </p>
                      </div>

                      <Link
                        href={`/occurrences/${card.id}`}
                        className={cn(buttonVariants({ variant: "outline" }), "justify-between")}
                      >
                        Mo form
                        <ArrowRightIcon />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50/60 p-6 text-sm text-slate-600">
                  Hom nay chua co occurrence nao. Kiem tra lai template active hoac job sinh occurrence.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-slate-200/70">
                <CardTitle>Tien do theo nguoi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.roster.map((member) => {
                  const total = member.completed + member.pending;
                  const completion = total ? Math.round((member.completed / total) * 100) : 0;

                  return (
                    <div
                      key={member.id}
                      className="rounded-[24px] border border-slate-200 bg-slate-50/75 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{member.fullName}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            {member.role}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{completion}%</p>
                          <p className="text-xs text-slate-500">{member.pending} chua xong</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#6366f1,#2dd4bf)]"
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {user.role === "TEAM_LEAD" ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-200/70">
                  <CardTitle>Template gan day</CardTitle>
                  <Link href="/templates" className={buttonVariants({ variant: "ghost" })}>
                    Xem tat ca
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.templates.slice(0, 4).map((template) => (
                    <div
                      key={template.id}
                      className="rounded-[24px] border border-slate-200 bg-slate-50/75 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{template.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                        </div>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                          Mẫu
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Quan tri he thong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-slate-600">
              Tai khoan admin co dashboard tong quan, con cac thao tac chi tiet ve
              nguoi dung, team va khu vuc duoc thuc hien trong khu quan tri rieng.
            </p>
            <Link href="/admin" className={buttonVariants({ size: "lg" })}>
              Mo khu quan tri
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
