"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { DttClassModel } from "@/lib/models/dtt-class";
import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
import { TaskModel } from "@/lib/models/task";
import { UserModel } from "@/lib/models/user";
import { toObjectId } from "@/lib/utils/ids";
import { connectToDatabase } from "@/lib/mongoose";
import { canManageDtt } from "@/lib/permissions";

async function requireManager() {
  await connectToDatabase();
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!canManageDtt(session)) {
    throw new Error("Bạn không có quyền quản lý.");
  }

  return session;
}

async function requireManagerTeam() {
  const session = await requireManager();
  if (!session.teamId) {
    throw new Error("Chưa xác định được nhóm của bạn.");
  }

  return {
    session,
    teamId: toObjectId(session.teamId),
  };
}

async function assertClassInTeam(classId: string, teamId: ReturnType<typeof toObjectId>) {
  const exists = await DttClassModel.exists({
    _id: toObjectId(classId),
    teamId,
  });

  if (!exists) {
    throw new Error("Không tìm thấy lớp học trong nhóm của bạn.");
  }
}

export async function createClassAction(name: string, startDayOfWeek: number): Promise<ActionResult> {
  return runAction(async () => {
    const { session, teamId } = await requireManagerTeam();

    await DttClassModel.create({
      name: name.trim(),
      startDayOfWeek,
      teamId,
      createdBy: toObjectId(session.id),
    });

    revalidatePath("/admin/dtt");
  });
}

export async function updateClassAction(classId: string, name: string, startDayOfWeek: number): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();
    const updated = await DttClassModel.findOneAndUpdate({
      _id: toObjectId(classId),
      teamId,
    }, {
      name: name.trim(),
      startDayOfWeek,
    }, {
      runValidators: true,
    });

    if (!updated) {
      throw new Error("Không tìm thấy lớp học trong nhóm của bạn.");
    }

    revalidatePath("/admin/dtt");
  });
}

export async function deleteClassAction(classId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();

    await assertClassInTeam(classId, teamId);

    const hasStudents = await DttEnrollmentModel.exists({
      classId: toObjectId(classId),
      teamId,
    });
    if (hasStudents) {
      throw new Error("Không thể xóa lớp học đang có học viên.");
    }

    await DttClassModel.findOneAndDelete({
      _id: toObjectId(classId),
      teamId,
    });
    revalidatePath("/admin/dtt");
  });
}

export async function enrollStudentAction(userId: string, classId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { session, teamId } = await requireManagerTeam();

    await assertClassInTeam(classId, teamId);

    const userInTeam = await UserModel.exists({
      _id: toObjectId(userId),
      status: "ACTIVE",
      teamId,
    });
    if (!userInTeam) {
      throw new Error("Không tìm thấy thành viên hoạt động trong nhóm của bạn.");
    }

    const exists = await DttEnrollmentModel.exists({ userId: toObjectId(userId) });
    if (exists) {
      throw new Error("Học viên đã tham gia một lớp học ĐTT khác.");
    }

    await DttEnrollmentModel.create({
      userId: toObjectId(userId),
      classId: toObjectId(classId),
      teamId,
      enrolledBy: toObjectId(session.id),
    });

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function unenrollStudentAction(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();
    const deleted = await DttEnrollmentModel.findOneAndDelete({
      userId: toObjectId(userId),
      teamId,
    });

    if (!deleted) {
      throw new Error("Không tìm thấy học viên ĐTT trong nhóm của bạn.");
    }

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function changeStudentClassAction(userId: string, classId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();

    await assertClassInTeam(classId, teamId);

    const updated = await DttEnrollmentModel.findOneAndUpdate(
      { userId: toObjectId(userId), teamId },
      { classId: toObjectId(classId) }
    );

    if (!updated) {
      throw new Error("Không tìm thấy học viên ĐTT trong nhóm của bạn.");
    }

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function toggleTaskDttAction(taskId: string, isDtt: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();
    const updated = await TaskModel.findOneAndUpdate(
      { _id: toObjectId(taskId), teamId, isActive: true },
      { isDtt }
    );

    if (!updated) {
      throw new Error("Không tìm thấy nhiệm vụ hoạt động trong nhóm của bạn.");
    }

    revalidatePath("/admin/dtt");
    revalidatePath("/templates");
    revalidatePath("/dashboard");
  });
}
