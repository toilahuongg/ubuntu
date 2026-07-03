"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { canPersonalizeTasks } from "@/lib/permissions";
import { getUserById } from "@/lib/services/organization-service";
import { TaskModel } from "@/lib/models/task";
import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";
import { connectToDatabase } from "@/lib/mongoose";
import { isWithinTaskOrgScope } from "@/lib/tasks/policy";
import { taskToScope } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";

export async function toggleTaskVisibilityAction(
  targetUserId: string,
  taskId: string,
  isVisible: boolean,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getSessionUser();
    if (!actor) throw new Error("Chưa đăng nhập.");

    await connectToDatabase();
    const targetUser = await getUserById(targetUserId);
    if (!targetUser) throw new Error("Thành viên không tồn tại.");

    if (!canPersonalizeTasks(actor, targetUser)) {
      throw new Error("Bạn không có quyền cấu hình hiển thị nhiệm vụ cho thành viên này.");
    }

    const task = await TaskModel.findOne({
      _id: toObjectId(taskId),
      isActive: true,
    }).lean();
    if (!task || !isWithinTaskOrgScope(taskToScope(task), targetUser)) {
      throw new Error("Nhiệm vụ không thuộc phạm vi của thành viên này.");
    }

    await UserTaskVisibilityModel.updateOne(
      { userId: toObjectId(targetUserId), taskId: toObjectId(taskId) },
      {
        userId: toObjectId(targetUserId),
        taskId: toObjectId(taskId),
        isVisible,
        updatedBy: toObjectId(actor.id),
      },
      { upsert: true }
    );

    revalidatePath("/dashboard");
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetUserId}/tasks`);
  });
}
