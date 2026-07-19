"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { getSessionUser } from "@/lib/auth/session";
import { canManageDtt } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/mongoose";
import { DttClassTaskModel } from "@/lib/models/dtt-class-task";
import { DttClassModel } from "@/lib/models/dtt-class";
import { createTask, updateTask } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";
import type { TaskTargetRole } from "@/lib/domain";

async function requireManagerTeam() {
  await connectToDatabase();
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageDtt(session)) throw new Error("Bạn không có quyền quản lý.");
  if (!session.teamId) throw new Error("Chưa xác định được nhóm.");
  return { session, teamId: toObjectId(session.teamId) };
}

async function assertClassInTeam(classId: string, teamId: ReturnType<typeof toObjectId>) {
  const exists = await DttClassModel.exists({ _id: toObjectId(classId), teamId });
  if (!exists) throw new Error("Không tìm thấy lớp học.");
}

export async function addClassTaskAction(
  classId: string,
  taskId: string,
  isInherited: boolean,
): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();
    await assertClassInTeam(classId, teamId);

    const existing = await DttClassTaskModel.exists({
      classId: toObjectId(classId),
      taskId: toObjectId(taskId),
    });
    if (existing) throw new Error("Nhiệm vụ đã thuộc lớp này.");

    await DttClassTaskModel.create({
      classId: toObjectId(classId),
      taskId: toObjectId(taskId),
      teamId,
      isInherited,
    });

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function removeClassTaskAction(
  classId: string,
  taskId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const { teamId } = await requireManagerTeam();
    await assertClassInTeam(classId, teamId);

    await DttClassTaskModel.findOneAndDelete({
      classId: toObjectId(classId),
      taskId: toObjectId(taskId),
    });

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
  });
}

export async function createCustomClassTaskAction(
  classId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { session, teamId } = await requireManagerTeam();
    await assertClassInTeam(classId, teamId);

    const taskId = await createTask(session, {
      title: (formData.get("title") as string)?.trim() ?? "",
      description: (formData.get("description") as string) ?? "",
      deadlineTime: (formData.get("deadlineTime") as string) ?? "20:00",
      expReward: Number(formData.get("expReward") ?? 10),
      pointReward: 0,
      lateWindowDays: Number(formData.get("lateWindowDays") ?? 7),
      targetRoles: formData.getAll("targetRoles").map(String) as TaskTargetRole[],
      taskType: "DAILY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      submissionMessage: (formData.get("submissionMessage") as string) ?? "",
      completionMessage: "",
    });

    await DttClassTaskModel.create({
      classId: toObjectId(classId),
      taskId: toObjectId(taskId),
      teamId,
      isInherited: false,
    });

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
    return { id: taskId };
  });
}

export async function updateCustomClassTaskAction(
  classId: string,
  taskId: string,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { session, teamId } = await requireManagerTeam();
    await assertClassInTeam(classId, teamId);

    const customAssignment = await DttClassTaskModel.exists({
      classId: toObjectId(classId),
      taskId: toObjectId(taskId),
      teamId,
      isInherited: false,
    });
    if (!customAssignment) {
      throw new Error("Không tìm thấy nhiệm vụ custom của lớp.");
    }

    await updateTask(session, taskId, {
      title: ((formData.get("title") as string) ?? "").trim(),
      description: (formData.get("description") as string) ?? "",
      deadlineTime: (formData.get("deadlineTime") as string) ?? "20:00",
      expReward: Number(formData.get("expReward") ?? 10),
      pointReward: 0,
      lateWindowDays: Number(formData.get("lateWindowDays") ?? 7),
      targetRoles: formData.getAll("targetRoles").map(String) as TaskTargetRole[],
      taskType: "DAILY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      scheduledWeekdays: [],
      scheduledMonthDays: [],
      submissionMessage: (formData.get("submissionMessage") as string) ?? "",
      completionMessage: "",
    });

    revalidatePath("/admin/dtt");
    revalidatePath("/dashboard");
    revalidatePath(`/tasks/${taskId}`);
    revalidatePath(`/tasks/${taskId}/proxy`);
  });
}
