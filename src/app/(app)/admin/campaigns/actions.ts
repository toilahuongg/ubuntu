"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runAction, type ActionResult } from "@/lib/actions/result";
import { getSessionUser } from "@/lib/auth/session";
import { saveDailyCampaign } from "@/lib/campaigns/campaign-service";
import {
  createCampaignOnlyTaskInput,
  createTask,
} from "@/lib/tasks/task-service";
import {
  campaignOnlyTaskInputSchema,
  saveDailyCampaignInputSchema,
} from "@/lib/validation";

async function requireSession() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return session;
}

export async function saveDailyCampaignAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = saveDailyCampaignInputSchema.parse({
      date: formData.get("date") ?? "",
      taskIds: formData.getAll("taskIds").map(String),
    });
    const id = await saveDailyCampaign(session, parsed);
    revalidatePath("/admin/campaigns");
    revalidatePath("/dashboard");
    return { id };
  });
}

export async function createCampaignOnlyTaskAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = campaignOnlyTaskInputSchema.parse({
      title: formData.get("title") ?? "",
      description: (formData.get("description") as string) ?? "",
      externalLabel: (formData.get("externalLabel") as string) ?? "",
      externalUrl: (formData.get("externalUrl") as string) ?? "",
      deadlineTime: formData.get("deadlineTime") ?? "20:00",
      expReward: Number(formData.get("expReward") ?? 10),
      pointReward: Number(formData.get("pointReward") ?? 10),
      lateWindowDays: Number(formData.get("lateWindowDays") ?? 1),
      targetRoles: formData.getAll("targetRoles").map(String),
      submissionMessage: (formData.get("submissionMessage") as string) ?? "",
      completionMessage: "",
      taskType: "DAILY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      scheduledWeekdays: [],
      scheduledMonthDays: [],
      isDtt: false,
      isActive: true,
    });
    const id = await createTask(session, createCampaignOnlyTaskInput(parsed));
    revalidatePath("/admin/campaigns");
    return { id };
  });
}
