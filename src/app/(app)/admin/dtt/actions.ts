"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { DttClassModel } from "@/lib/models/dtt-class";
import { DttEnrollmentModel } from "@/lib/models/dtt-enrollment";
import { TaskModel } from "@/lib/models/task";
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

export async function createClassAction(name: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManager();
    if (!session.teamId) throw new Error("Tài khoản của bạn chưa thuộc nhóm nào.");

    await DttClassModel.create({
      name: name.trim(),
      teamId: toObjectId(session.teamId),
      createdBy: toObjectId(session.id),
    });

    revalidatePath("/admin/dtt");
  });
}

export async function updateClassAction(classId: string, name: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireManager();
    await DttClassModel.findByIdAndUpdate(toObjectId(classId), {
      name: name.trim(),
    });
    revalidatePath("/admin/dtt");
  });
}

export async function deleteClassAction(classId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireManager();

    const hasStudents = await DttEnrollmentModel.exists({ classId: toObjectId(classId) });
    if (hasStudents) {
      throw new Error("Không thể xóa lớp học đang có học viên.");
    }

    await DttClassModel.findByIdAndDelete(toObjectId(classId));
    revalidatePath("/admin/dtt");
  });
}

export async function enrollStudentAction(userId: string, classId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManager();
    if (!session.teamId) throw new Error("Chưa xác định được nhóm của bạn.");

    const exists = await DttEnrollmentModel.exists({ userId: toObjectId(userId) });
    if (exists) {
      throw new Error("Học viên đã tham gia một lớp học ĐTT khác.");
    }

    await DttEnrollmentModel.create({
      userId: toObjectId(userId),
      classId: toObjectId(classId),
      teamId: toObjectId(session.teamId),
      enrolledBy: toObjectId(session.id),
    });

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function unenrollStudentAction(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireManager();
    await DttEnrollmentModel.findOneAndDelete({ userId: toObjectId(userId) });
    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function changeStudentClassAction(userId: string, classId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireManager();
    await DttEnrollmentModel.findOneAndUpdate(
      { userId: toObjectId(userId) },
      { classId: toObjectId(classId) }
    );
    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function toggleTaskDttAction(taskId: string, isDtt: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await requireManager();
    await TaskModel.findByIdAndUpdate(toObjectId(taskId), { isDtt });
    revalidatePath("/admin/dtt");
    revalidatePath("/templates");
    revalidatePath("/dashboard");
  });
}
