"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import type { SessionUser } from "@/lib/domain";
import { canManageTasks } from "@/lib/permissions";
import {
  createTask,
  deleteTask,
  toggleTask,
  updateTask,
} from "@/lib/tasks/task-service";
import {
  taskInputSchema,
  toggleTaskInputSchema,
  updateTaskInputSchema,
} from "@/lib/validation";

async function requireManager(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!canManageTasks(session)) {
    throw new Error("Bạn không có quyền quản lý nhiệm vụ.");
  }
  return session;
}

export async function createTaskAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const session = await requireManager();
    const rawTargetCount = formData.get("targetCount");
    const parsed = taskInputSchema.parse({
      title: formData.get("title") ?? "",
      description: (formData.get("description") as string) ?? "",
      deadlineTime: formData.get("deadlineTime") ?? "",
      expReward: Number(formData.get("expReward") ?? 10),
      pointReward: Number(formData.get("pointReward") ?? 10),
      lateWindowDays: Number(formData.get("lateWindowDays") ?? 7),
      isActive: formData.get("isActive") === "true",
      taskType:
        (formData.get("taskType") as string | null) ?? "MONTHLY_PER_MEMBER",
      targetCount:
        rawTargetCount != null && rawTargetCount !== ""
          ? Number(rawTargetCount)
          : undefined,
    });
    const id = await createTask(session, parsed);
    revalidatePath("/templates");
    revalidatePath("/dashboard");
    return { id };
  });
}

export async function updateTaskAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManager();
    const rawTargetCount = formData.get("targetCount");
    const parsed = updateTaskInputSchema.parse({
      taskId: formData.get("taskId") ?? "",
      title: formData.get("title") ?? "",
      description: (formData.get("description") as string) ?? "",
      deadlineTime: formData.get("deadlineTime") ?? "",
      expReward: Number(formData.get("expReward") ?? 10),
      pointReward: Number(formData.get("pointReward") ?? 10),
      lateWindowDays: Number(formData.get("lateWindowDays") ?? 7),
      targetCount:
        rawTargetCount != null && rawTargetCount !== ""
          ? Number(rawTargetCount)
          : undefined,
    });
    const { taskId, ...rest } = parsed;
    await updateTask(session, taskId, rest);
    revalidatePath("/templates");
    revalidatePath("/dashboard");
    revalidatePath(`/tasks/${taskId}`);
    revalidatePath(`/tasks/${taskId}/proxy`);
  });
}

export async function toggleTaskAction(
  taskId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManager();
    const parsed = toggleTaskInputSchema.parse({ taskId });
    await toggleTask(session, parsed.taskId);
    revalidatePath("/templates");
    revalidatePath("/dashboard");
  });
}

export async function deleteTaskAction(
  taskId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManager();
    const parsed = toggleTaskInputSchema.parse({ taskId });
    await deleteTask(session, parsed.taskId);
    revalidatePath("/templates");
    revalidatePath("/dashboard");
  });
}
