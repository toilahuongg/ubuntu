import type { DailyCampaignAdminView } from "@/lib/campaigns/campaign-service";

export function CampaignReport({ data }: { data: DailyCampaignAdminView }) {
  if (data.report.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Chưa có kết quả chiến dịch cho hôm nay.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {data.report.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {row.completed}/{row.total} nhiệm vụ
            </p>
          </div>
          <span
            className={
              row.isComplete
                ? "text-xs font-semibold text-primary"
                : "text-xs font-semibold text-muted-foreground"
            }
          >
            {row.isComplete ? "Hoàn thành" : "Đang làm"}
          </span>
        </div>
      ))}
    </div>
  );
}
