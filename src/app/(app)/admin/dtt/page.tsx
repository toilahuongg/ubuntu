import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { canManageDtt } from "@/lib/permissions";
import { DttClassModel } from "@/lib/models/dtt-class";
import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
import { TaskModel } from "@/lib/models/task";
import { UserModel } from "@/lib/models/user";
import { toObjectId } from "@/lib/utils/ids";
import { connectToDatabase } from "@/lib/mongoose";
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

  // Load all classes for the team
  const classes = await DttClassModel.find({ teamId }).lean();
  
  // Load all active DTT enrollments for the team
  const enrollments = await DttEnrollmentModel.find({ teamId }).lean();
  
  // Load all active users in the team
  const teamMembers = await UserModel.find({
    teamId,
    status: "ACTIVE",
  }).select({ fullName: 1, role: 1 }).lean();

  // Filter users not currently in DTT
  const enrolledUserIds = new Set(enrollments.map((e) => e.userId.toString()));
  const nonDttMembers = teamMembers.filter((m) => !enrolledUserIds.has(m._id.toString()));

  // Load active tasks for the team
  const tasks = await TaskModel.find({
    isActive: true,
    teamId,
  }).sort({ createdAt: -1 }).lean();

  const formattedClasses = classes.map((c) => ({
    id: c._id.toString(),
    name: c.name,
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
  }));

  const formattedTasks = tasks.map((t) => ({
    id: t._id.toString(),
    title: t.title,
    isDtt: !!t.isDtt,
  }));

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
        tasks={formattedTasks}
      />
    </div>
  );
}
