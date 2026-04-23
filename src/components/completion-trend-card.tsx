import type { TrendPoint } from "@/lib/services/analytics-service";
import { AnalyticsChart } from "@/components/analytics-chart";

type CompletionTrendCardProps = {
  data: TrendPoint[];
  todayCount: number;
  description?: string;
};

export function CompletionTrendCard({
  data,
  todayCount,
  description = "Tổng lượt hoàn thành trong phạm vi quản lý.",
}: CompletionTrendCardProps) {
  return (
    <section className="glass-card overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold">
            Xu hướng 14 ngày
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="rounded-md bg-overlay-subtle px-2 py-0.5 text-[11px] font-semibold text-foreground/70">
          {todayCount.toLocaleString("vi-VN")} hôm nay
        </span>
      </div>
      <AnalyticsChart data={data} />
    </section>
  );
}
