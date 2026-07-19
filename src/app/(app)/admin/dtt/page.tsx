import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { canManageDtt } from "@/lib/permissions";
import { DttClassModel } from "@/lib/models/dtt-class";
import { DttClassTaskModel } from "@/lib/models/dtt-class-task";
import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
import { TaskModel } from "@/lib/models/task";
import { UserModel } from "@/lib/models/user";
import { RegionModel } from "@/lib/models/region";
import { toObjectId } from "@/lib/utils/ids";
import { connectToDatabase } from "@/lib/mongoose";
import {
  type DttClassTaskAssignmentSource,
  loadAllDttClassTaskIdsForTeam,
  mapDttClassTasksByClass,
} from "@/lib/dtt/class-task-service";
import { AdminSubHeader } from "../sub-header";
import { DttManager } from "./dtt-manager";

export const dynamic = "force-dynamic";

export default async function DttManagementPage() {
  await connectToDatabase();
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageDtt(session)) redirect("/admin");
  if (!session.teamId) redirect("/admin");

  const teamId = toObjectId(session.teamId);

  const classes = await DttClassModel.find({ teamId }).lean();
  const enrollments = await DttEnrollmentModel.find({ teamId }).lean();
  const teamMembers = await UserModel.find({
    teamId,
    status: "ACTIVE",
  }).select({ fullName: 1, role: 1, regionId: 1 }).lean();

  const regions = await RegionModel.find({ teamId }).lean();
  const regionMap = new Map(
    regions.map((r) => [r._id.toString(), r.name])
  );

  const enrolledUserIds = new Set(enrollments.map((e) => e.userId.toString()));
  const nonDttMembers = teamMembers.filter((m) => !enrolledUserIds.has(m._id.toString()));

  const formattedClasses = classes.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    startDayOfWeek: c.startDayOfWeek ?? 1,
  }));

  const formattedEnrollments = enrollments.map((e) => {
    const user = teamMembers.find((m) => m._id.toString() === e.userId.toString());
    const classItem = classes.find((c) => c._id.toString() === e.classId.toString());
    return {
      userId: e.userId.toString(),
      fullName: user?.fullName ?? "Không rõ",
      role: user?.role ?? "",
      classId: e.classId.toString(),
      className: classItem?.name ?? "Lớp đã bị xóa",
      enrolledAt: e.enrolledAt.toISOString(),
    };
  });

  const formattedNonDttMembers = nonDttMembers.map((m) => ({
    id: m._id.toString(),
    fullName: m.fullName,
    role: m.role,
    regionId: m.regionId?.toString() ?? null,
    regionName: m.regionId
      ? (regionMap.get(m.regionId.toString()) ?? null)
      : null,
  }));

  // Fetch available tasks (not already assigned to any DTT class)
  const dttClassTaskIds = await loadAllDttClassTaskIdsForTeam(session.teamId);

  const availableTasks = (await TaskModel.find({
    isActive: true,
    teamId,
    _id: { $nin: Array.from(dttClassTaskIds).map(toObjectId) },
  })
    .select("title expReward pointReward")
    .sort({ createdAt: -1 })
    .lean())
    .map((t) => ({
      id: t._id.toString(),
      title: t.title,
      expReward: t.expReward ?? 10,
      pointReward: t.pointReward ?? 10,
    }));

  // Fetch class task assignments
  const classAssignments = (await DttClassTaskModel.find({ teamId })
    .populate(
      "taskId",
      "title description deadlineTime expReward lateWindowDays targetRoles submissionMessage",
    )
    .lean()) as unknown as DttClassTaskAssignmentSource[];

  const classTasksByClass = mapDttClassTasksByClass(classAssignments);

  return (
    <div className="space-y-6 animate-slide-up pb-8">
      <AdminSubHeader
        title="Trường học Đấng Tiên Tri"
        description="Quản lý lớp học, phân chia học viên và cấu hình các nhiệm vụ học tập"
      />

      <DttManager
        classes={formattedClasses}
        enrollments={formattedEnrollments}
        nonDttMembers={formattedNonDttMembers}
        availableTasks={availableTasks}
        classTasksByClass={classTasksByClass}
      />
    </div>
  );
}
