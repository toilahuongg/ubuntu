import Link from "next/link";
import { ListChecks } from "lucide-react";

import { AdminSubHeader } from "../sub-header";
import { getCampaignReportAdminView } from "./campaign-data";
import { CampaignReport } from "./campaign-report";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const { campaigns, data, selectedDate, todayDate } =
    await getCampaignReportAdminView(date);
  const previousCampaigns = campaigns.filter(
    (campaign) => campaign.date !== todayDate,
  );

  return (
    <>
      <AdminSubHeader
        title="Báo cáo chiến dịch"
        description={`Kết quả chiến dịch ngày ${selectedDate}`}
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/campaigns"
              className={
                selectedDate === todayDate
                  ? "btn-primary-gradient inline-flex h-9 items-center px-3 text-sm"
                  : "inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm text-muted-foreground"
              }
            >
              Hôm nay
            </Link>
            {previousCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/admin/campaigns?date=${campaign.date}`}
                className={
                  campaign.date === selectedDate
                    ? "btn-primary-gradient inline-flex h-9 items-center px-3 text-sm"
                    : "inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm text-muted-foreground"
                }
              >
                {campaign.date}
              </Link>
            ))}
          </div>
          <Link
            href="/admin/campaigns/tasks"
            className="btn-secondary-gradient inline-flex h-10 items-center gap-2 px-4 text-sm"
          >
            <ListChecks className="h-4 w-4" />
            Tạo chiến dịch hôm nay
          </Link>
        </div>
        <CampaignReport data={data} />
      </div>
    </>
  );
}
