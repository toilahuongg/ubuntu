"use client";

import { useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Users } from "lucide-react";

import type {
  AdminOperationsPeriod,
  AdminOperationsView,
} from "@/lib/services/admin-operations-types";

type OperationsDashboardProps = {
  data: AdminOperationsView;
};

const PERIODS: Array<{
  key: AdminOperationsPeriod;
  label: string;
  shortLabel: string;
}> = [
  { key: "day", label: "Hôm nay", shortLabel: "Ngày" },
  { key: "week", label: "Tuần này", shortLabel: "Tuần" },
  { key: "month", label: "Tháng này", shortLabel: "Tháng" },
];

const STATUS_LABELS: Record<
  AdminOperationsView["members"][number]["status"],
  string
> = {
  complete: "Hoàn thành",
  idle: "Không có task",
  in_progress: "Đang làm",
  needs_attention: "Cần chú ý",
};

export function OperationsDashboard({ data }: OperationsDashboardProps) {
  const [period, setPeriod] = useState<AdminOperationsPeriod>("day");
  const activeSummary = data.periods[period];

  return (
    <div className="space-y-5">
      <section className="glass-card overflow-hidden p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
              <BarChart3 className="h-3.5 w-3.5" />
              {data.scope.roleLabel}
            </div>
            <h1 className="truncate font-display text-2xl font-bold">
              {data.scope.name}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.scope.memberCount} thành viên trong phạm vi quản lý.
            </p>
          </div>
          <ProgressRing value={data.periods.day.completionPercent} />
        </div>

        <PeriodTabs active={period} onChange={setPeriod} />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricCard label="Đã giao" value={activeSummary.assigned} />
          <MetricCard label="Đã xong" value={activeSummary.completed} />
          <MetricCard label="Còn thiếu" value={activeSummary.pending} tone="warn" />
        </div>
      </section>

      <MemberProgressPanel data={data} period={period} />
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div
      className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${value}%, var(--overlay-subtle) 0)`,
      }}
      aria-label={`Hoàn thành hôm nay ${value}%`}
      role="img"
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-card shadow-sm">
        <div className="text-center">
          <p className="text-lg font-bold leading-none">{value}%</p>
          <p className="text-[10px] text-muted-foreground">hôm nay</p>
        </div>
      </div>
    </div>
  );
}

function PeriodTabs({
  active,
  onChange,
}: {
  active: AdminOperationsPeriod;
  onChange: (period: AdminOperationsPeriod) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 rounded-2xl bg-overlay-subtle p-1 ring-1 ring-border">
      {PERIODS.map((period) => (
        <button
          key={period.key}
          type="button"
          onClick={() => onChange(period.key)}
          className={`cursor-pointer rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
            active === period.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-2xl bg-overlay-subtle p-3 ring-1 ring-border">
      <p
        className={`text-lg font-bold leading-none ${
          tone === "warn" && value > 0 ? "text-amber-700" : ""
        }`}
      >
        {value.toLocaleString("vi-VN")}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function MemberProgressPanel({
  data,
  period,
}: {
  data: AdminOperationsView;
  period: AdminOperationsPeriod;
}) {
  const periodLabel = PERIODS.find((entry) => entry.key === period)?.shortLabel;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-4 w-4" />
          Tiến độ thành viên
        </h2>
        <span className="rounded-full bg-overlay-subtle px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
          {periodLabel}
        </span>
      </div>

      {data.members.length === 0 ? (
        <EmptyCard text="Chưa có thành viên trong phạm vi này." />
      ) : (
        <div className="glass-card divide-y divide-border overflow-hidden">
          {data.members.map((member) => {
            const summary = member.periods[period];
            return (
              <div key={member.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {member.fullName}
                      </p>
                      <span className="rounded-md bg-overlay-subtle px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {member.roleLabel}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-overlay-subtle">
                      <div
                        className={`h-full rounded-full ${
                          member.status === "needs_attention"
                            ? "bg-amber-500"
                            : "bg-primary"
                        }`}
                        style={{ width: `${summary.completionPercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {summary.completed}/{summary.assigned} task slot hoàn thành
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">
                      {summary.completionPercent}%
                    </p>
                    <StatusBadge status={member.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: AdminOperationsView["members"][number]["status"];
}) {
  const isAttention = status === "needs_attention";
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isAttention
          ? "bg-amber-100 text-amber-800"
          : "bg-overlay-subtle text-muted-foreground"
      }`}
    >
      {isAttention && <AlertTriangle className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="glass-card flex flex-col items-center py-8 text-center">
      <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
