"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { setMonthlyGoal } from "@/lib/tasks/task-service";
import { monthlyGoalInputSchema } from "@/lib/validation";

export async function setMonthlyGoalAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await getSessionUser();
    if (!session) redirect("/login");
    const rawTarget = formData.get("targetCount");
    const parsed = monthlyGoalInputSchema.parse({
      taskId: formData.get("taskId") ?? "",
      yearMonth: formData.get("yearMonth") ?? "",
      targetCount: Number(rawTarget ?? 0),
    });
    await setMonthlyGoal(
      session,
      parsed.taskId,
      parsed.yearMonth,
      parsed.targetCount,
    );
    revalidatePath(`/tasks/${parsed.taskId}`);
    revalidatePath("/dashboard");
  });
}
