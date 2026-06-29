"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { canManageUser } from "@/lib/permissions";
import { getUserById } from "@/lib/services/organization-service";
import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";
import { connectToDatabase } from "@/lib/mongoose";
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

    if (!canManageUser(actor, targetUser)) {
      throw new Error("Bạn không có quyền quản lý thành viên này.");
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
