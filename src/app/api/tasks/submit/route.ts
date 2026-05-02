import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { getTodayDateKey } from "@/lib/dates";
import type { ActionResult } from "@/lib/actions/result";
import { resolveSubmissionRevalidationPaths } from "@/lib/tasks/revalidation";
import {
  saveSubmission,
  type SaveSubmissionResult,
} from "@/lib/tasks/submission-service";
import { submitTaskInputSchema } from "@/lib/validation";

const submitTaskApiSchema = submitTaskInputSchema.extend({
  revalidationPaths: z.array(z.string()).optional(),
});

function toActionError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json<ActionResult<SaveSubmissionResult>>(
      { ok: false, error: "Vui lòng đăng nhập lại." },
      { status: 401 },
    );
  }

  try {
    const body = submitTaskApiSchema.parse(await request.json());
    const today = getTodayDateKey();
    const effectiveDate = body.dateKey ?? today;
    const isSettingZero = body.mode === "set" && (body.count ?? 0) === 0;
    const result = await saveSubmission(
      session,
      body.taskId,
      body.subjectUserId,
      effectiveDate,
      {
        notify: effectiveDate === today && !isSettingZero,
        count: body.count,
        mode: body.mode,
      },
    );

    for (const path of resolveSubmissionRevalidationPaths(body.revalidationPaths)) {
      revalidatePath(path);
    }

    return NextResponse.json<ActionResult<SaveSubmissionResult>>({
      ok: true,
      data: result,
    });
  } catch (err) {
    return NextResponse.json<ActionResult<SaveSubmissionResult>>({
      ok: false,
      error: toActionError(err),
    });
  }
}
