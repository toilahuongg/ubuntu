import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { listCustomers } from "@/lib/services/customer-service";
import {
  HEART_STATUS_COLORS,
  HEART_STATUS_LABELS,
} from "@/lib/customer/constants";
import type { HeartStatus } from "@/lib/customer/constants";

export default async function CustomerDashboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const customers = await listCustomers(session);

  const total = customers.length;
  const baptized = customers.filter((c) => c.isBaptized).length;
  const avgDaysSinceInteraction =
    customers.length > 0
      ? Math.round(
          customers.reduce((sum, c) => {
            const days = c.lastInteractionAt
              ? Math.floor(
                  (new Date().getTime() - new Date(c.lastInteractionAt).getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 999;
            return sum + days;
          }, 0) / customers.length,
        )
      : 0;

  const heartStatusCounts = customers.reduce<Record<string, number>>(
    (acc, c) => {
      acc[c.heartStatus] = (acc[c.heartStatus] || 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-slide-up">
      <div>
        <h1 className="font-display text-lg font-bold tracking-tight">
          Tổng quan học viên
        </h1>
        <p className="text-xs text-muted-foreground">
          Số liệu chăm sóc của bạn
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Học viên</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{baptized}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Đã BT</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">
            {avgDaysSinceInteraction}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ngày/TB chưa chăm
          </p>
        </div>
      </div>

      {/* Heart Status Breakdown */}
      <section className="space-y-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Phân bố tấm lòng
        </h2>

        {Object.keys(heartStatusCounts).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(heartStatusCounts).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-3 rounded-xl bg-overlay-subtle px-3 py-2 ring-1 ring-border"
              >
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${HEART_STATUS_COLORS[status as HeartStatus]}`}
                >
                  {HEART_STATUS_LABELS[status as HeartStatus]}
                </span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-overlay-medium ring-1 ring-border">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((count / total) * 100)}%`,
                        backgroundColor:
                          HEART_STATUS_COLORS[
                            status as HeartStatus
                          ].split(" ")[0],
                      }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right text-xs font-semibold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card px-5 py-8 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu.
          </div>
        )}
      </section>
    </div>
  );
}
