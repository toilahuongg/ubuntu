"use server";

import { revalidatePath } from "@/lib/revalidate";
import { redirect } from "react-router";

import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { getTodayDateKey } from "@/lib/dates";
import type { SessionUser } from "@/lib/domain";
import { resolveSubmissionRevalidationPaths } from "@/lib/tasks/revalidation";
import { saveSubmission, type SaveSubmissionResult } from "@/lib/tasks/submission-service";
import { submitTaskInputSchema } from "@/lib/validation";

async function requireSession(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");
  return session;
}

export async function submitTaskAction(
  taskId: string,
  subjectUserId: string,
  dateKey?: string,
  count?: number,
  mode?: "increment" | "set",
  revalidationPaths?: readonly string[],
): Promise<ActionResult<SaveSubmissionResult>> {
  return runAction(async () => {
    const parsed = submitTaskInputSchema.parse({
      taskId,
      subjectUserId,
      dateKey,
      count,
      mode,
    });
    const session = await requireSession();
    const today = getTodayDateKey();
    const effectiveDate = parsed.dateKey ?? today;
    const isSettingZero =
      parsed.mode === "set" && (parsed.count ?? 0) === 0;
    const result = await saveSubmission(
      session,
      parsed.taskId,
      parsed.subjectUserId,
      effectiveDate,
      {
        notify: effectiveDate === today && !isSettingZero,
        count: parsed.count,
        mode: parsed.mode,
      },
    );
    for (const path of resolveSubmissionRevalidationPaths(revalidationPaths)) {
      revalidatePath(path);
    }
    return result;
  });
}
