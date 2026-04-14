"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { getTodayDateKey } from "@/lib/dates";
import type { SessionUser } from "@/lib/domain";
import { saveSubmission, type SaveSubmissionResult } from "@/lib/tasks/submission-service";
import { submitTaskInputSchema } from "@/lib/validation";

async function requireSession(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return session;
}

export async function submitTaskAction(
  taskId: string,
  subjectUserId: string,
  dateKey?: string,
): Promise<ActionResult<SaveSubmissionResult>> {
  return runAction(async () => {
    const parsed = submitTaskInputSchema.parse({
      taskId,
      subjectUserId,
      dateKey,
    });
    const session = await requireSession();
    const today = getTodayDateKey();
    const effectiveDate = parsed.dateKey ?? today;
    const result = await saveSubmission(
      session,
      parsed.taskId,
      parsed.subjectUserId,
      effectiveDate,
      { notify: effectiveDate === today },
    );
    revalidatePath("/dashboard");
    revalidatePath(`/tasks/${parsed.taskId}`);
    revalidatePath(`/tasks/${parsed.taskId}/proxy`);
    revalidatePath("/region");
    revalidatePath("/zone");
    return result;
  });
}
