import { AdminSubHeader } from "../../../sub-header";
import { requireCampaignAdminSession } from "../../campaign-data";
import { CampaignTaskForm } from "../../campaign-task-form";

export default async function NewCampaignTaskPage() {
  await requireCampaignAdminSession();

  return (
    <>
      <AdminSubHeader
        backHref="/admin/campaigns/tasks"
        title="Task mới"
        description="Tạo nhiệm vụ riêng để dùng trong chiến dịch ngày"
      />
      <CampaignTaskForm />
    </>
  );
}
