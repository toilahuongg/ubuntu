import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { canManageDtt } from "@/lib/permissions";
import { toObjectId } from "@/lib/utils/ids";
import { connectToDatabase } from "@/lib/mongoose";
import { DttClassModel } from "@/lib/models/dtt-class";
import { AdminSubHeader } from "../../../../sub-header";
import { ReportClient } from "./report-client";
import { buildClassReport } from "@/lib/dtt/class-task-service";

export const dynamic = "force-dynamic";

export default async function ClassReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { classId } = await params;
  const { date } = await searchParams;

  await connectToDatabase();
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageDtt(session)) redirect("/admin");
  if (!session.teamId) redirect("/admin");

  const teamId = toObjectId(session.teamId);

  // Verify class exists and belongs to team
  const dttClass = await DttClassModel.findOne({
    _id: toObjectId(classId),
    teamId,
  }).lean();

  if (!dttClass) {
    redirect("/admin/dtt");
  }

  const dateKey = date || new Date().toISOString().split("T")[0];

  const reportData = await buildClassReport(classId, session.teamId, dateKey);

  return (
    <div className="space-y-6 animate-slide-up pb-8">
      <AdminSubHeader
        title={`Báo cáo lớp: ${dttClass.name}`}
        description="Theo dõi tiến độ hoàn thành nhiệm vụ hàng ngày của học viên"
      />

      <ReportClient
        reportData={reportData}
        className={dttClass.name}
        classId={classId}
      />
    </div>
  );
}
