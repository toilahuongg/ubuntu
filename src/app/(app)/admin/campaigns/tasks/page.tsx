import { AdminSubHeader } from "../../sub-header";
import { getCurrentDailyCampaignAdminView } from "../campaign-data";
import { CampaignTaskSelector } from "../campaign-task-selector";

export default async function CampaignTasksPage() {
  const data = await getCurrentDailyCampaignAdminView();

  return (
    <>
      <AdminSubHeader
        backHref="/admin/campaigns"
        title="Tạo chiến dịch hôm nay"
        description="Chọn tasks áp dụng cho chiến dịch hôm nay rồi bấm Lưu"
      />
      <CampaignTaskSelector data={data} />
    </>
  );
}
