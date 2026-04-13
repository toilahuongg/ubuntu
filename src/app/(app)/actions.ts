"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearSessionCookie } from "@/lib/auth/session";
import { requireAdminUser, requireCurrentUser } from "@/lib/current-user";
import { ROLES, USER_STATUSES, type Role } from "@/lib/domain";
import {
  createRegion,
  createTeam,
  saveUser,
} from "@/lib/services/organization-service";
import {
  createTaskTemplate,
  saveSubmission,
  toggleTaskTemplate,
} from "@/lib/services/task-service";
import { normalizeOptionalText, normalizeText, slugifyCode } from "@/lib/utils/text";
import { parseTaskSchemaJson, taskTemplateInputSchema } from "@/lib/validation";

function withNotice(path: string, type: "error" | "success", message: string) {
  const [pathname, existingQuery = ""] = path.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set(type, message);
  return `${pathname}?${params.toString()}`;
}

function parseRole(rawRole: string): Role {
  if (ROLES.includes(rawRole as Role)) {
    return rawRole as Role;
  }

  throw new Error("Vai trò không hợp lệ.");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function createTeamAction(formData: FormData) {
  await requireAdminUser();

  try {
    const name = normalizeText(formData.get("name"));
    const code = slugifyCode(normalizeText(formData.get("code"), name));

    if (!name) {
      throw new Error("Tên nhóm là bắt buộc.");
    }

    await createTeam(name, code);
    revalidatePath("/admin");
    redirect(withNotice("/admin", "success", "Da tao nhom moi."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the tao nhom.";
    redirect(withNotice("/admin", "error", message));
  }
}

export async function createRegionAction(formData: FormData) {
  await requireAdminUser();

  try {
    const name = normalizeText(formData.get("name"));
    const teamId = normalizeText(formData.get("teamId"));
    const code = slugifyCode(normalizeText(formData.get("code"), name));

    if (!name || !teamId) {
      throw new Error("Tên khu vực và nhóm cha là bắt buộc.");
    }

    await createRegion({ code, name, teamId });
    revalidatePath("/admin");
    redirect(withNotice("/admin", "success", "Da tao khu vuc moi."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the tao khu vuc.";
    redirect(withNotice("/admin", "error", message));
  }
}

export async function saveUserAction(formData: FormData) {
  await requireAdminUser();

  try {
    const role = parseRole(normalizeText(formData.get("role")));
    const statusValue = normalizeText(formData.get("status"), "ACTIVE");

    if (!USER_STATUSES.includes(statusValue as (typeof USER_STATUSES)[number])) {
      throw new Error("Trạng thái người dùng không hợp lệ.");
    }

    const telegramRaw = normalizeOptionalText(formData.get("telegramId"));

    await saveUser({
      fullName: normalizeText(formData.get("fullName")),
      regionId: normalizeOptionalText(formData.get("regionId")),
      role,
      status: statusValue as (typeof USER_STATUSES)[number],
      teamId: normalizeOptionalText(formData.get("teamId")),
      telegramId: telegramRaw ? Number(telegramRaw) : undefined,
      userId: normalizeOptionalText(formData.get("userId")),
      username: normalizeOptionalText(formData.get("username")),
    });

    revalidatePath("/admin");
    redirect(withNotice("/admin", "success", "Da luu nguoi dung."));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Khong the luu nguoi dung.";
    redirect(withNotice("/admin", "error", message));
  }
}

export async function createTaskTemplateAction(formData: FormData) {
  const actor = await requireCurrentUser();

  try {
    const rawSchema = normalizeText(formData.get("formSchemaJson"));
    const parsedSchema = parseTaskSchemaJson(rawSchema);
    const parsedInput = taskTemplateInputSchema.parse({
      deadlineTime: normalizeText(formData.get("deadlineTime")),
      description: normalizeOptionalText(formData.get("description")) || "",
      formSchema: parsedSchema,
      isActive: formData.get("isActive") === "on",
      title: normalizeText(formData.get("title")),
    });

    await createTaskTemplate(actor, parsedInput);
    revalidatePath("/templates");
    revalidatePath("/dashboard");
    redirect(withNotice("/templates", "success", "Da tao template moi."));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Khong the tao template.";
    redirect(withNotice("/templates", "error", message));
  }
}

export async function toggleTaskTemplateAction(formData: FormData) {
  const actor = await requireCurrentUser();

  try {
    const templateId = normalizeText(formData.get("templateId"));
    await toggleTaskTemplate(actor, templateId);
    revalidatePath("/templates");
    revalidatePath("/dashboard");
    redirect(withNotice("/templates", "success", "Da cap nhat trang thai."));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Khong the doi trang thai.";
    redirect(withNotice("/templates", "error", message));
  }
}

export async function saveSubmissionAction(formData: FormData) {
  const actor = await requireCurrentUser();

  const occurrenceId = normalizeText(formData.get("occurrenceId"));
  const subjectUserId = normalizeText(formData.get("subjectUserId"));

  try {
    await saveSubmission(actor, occurrenceId, subjectUserId, formData);
    revalidatePath("/dashboard");
    revalidatePath(`/occurrences/${occurrenceId}`);
    redirect(
      withNotice(
        `/occurrences/${occurrenceId}?subject=${subjectUserId}`,
        "success",
        "Da luu cap nhat.",
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Khong the luu bai nop.";
    redirect(
      withNotice(
        `/occurrences/${occurrenceId}?subject=${subjectUserId}`,
        "error",
        message,
      ),
    );
  }
}
