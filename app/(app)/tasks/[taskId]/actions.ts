"use server";

import { revalidatePath } from "@/lib/revalidate";
import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { setTaskReminderPreference } from "@/lib/tasks/reminder-service";
import { setMonthlyGoal } from "@/lib/tasks/task-service";
import {
  monthlyGoalInputSchema,
  taskReminderPreferenceInputSchema,
} from "@/lib/validation";

export async function setMonthlyGoalAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await getSessionUser();
    if (!session) throw redirect("/login");
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

export async function setTaskReminderPreferenceAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await getSessionUser();
    if (!session) throw redirect("/login");
    const parsed = taskReminderPreferenceInputSchema.parse({
      enabled: formData.get("enabled") === "true",
      reminderTime: formData.get("reminderTime") ?? "",
      taskId: formData.get("taskId") ?? "",
    });
    await setTaskReminderPreference(session, parsed);
    revalidatePath(`/tasks/${parsed.taskId}`);
    revalidatePath("/dashboard");
  });
}
