"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import {
  createTaskTemplate,
  saveSubmission,
  toggleTaskTemplate,
} from "@/lib/services/task-service";
import {
  approveUser,
  createRegion,
  createTeam,
  saveUser,
  assignRegionalLead,
  updateUserProfile,
} from "@/lib/services/organization-service";

async function requireSession() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }
  return session;
}

// ── Task Submission ──

export async function submitTaskAction(
  occurrenceId: string,
  subjectUserId: string,
) {
  const session = await requireSession();
  await saveSubmission(session, occurrenceId, subjectUserId);
  revalidatePath("/dashboard");
  revalidatePath(`/tasks/${occurrenceId}`);
}

// ── Task Templates ──

export async function createTemplateAction(formData: FormData) {
  const session = await requireSession();

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const deadlineTime = formData.get("deadlineTime") as string;
  const expReward = Number(formData.get("expReward")) || 10;
  const isActive = formData.get("isActive") === "true";

  await createTaskTemplate(session, {
    deadlineTime,
    description,
    expReward,
    isActive,
    title,
  });

  revalidatePath("/templates");
  revalidatePath("/dashboard");
}

export async function toggleTemplateAction(templateId: string) {
  const session = await requireSession();
  await toggleTaskTemplate(session, templateId);
  revalidatePath("/templates");
  revalidatePath("/dashboard");
}

// ── Organization ──

export async function approveUserAction(userId: string) {
  await requireSession();
  await approveUser(userId);
  revalidatePath("/admin");
}

export async function createTeamAction(formData: FormData) {
  await requireSession();
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await createTeam(name, code);
  revalidatePath("/admin");
}

export async function createRegionAction(formData: FormData) {
  await requireSession();
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const teamId = formData.get("teamId") as string;
  await createRegion({ code, name, teamId });
  revalidatePath("/admin");
}

export async function saveUserAction(formData: FormData) {
  const session = await requireSession();

  await saveUser({
    fullName: formData.get("fullName") as string,
    gender: (formData.get("gender") as string) || undefined,
    regionId: (formData.get("regionId") as string) || undefined,
    role: formData.get("role") as "TEAM_LEAD" | "REGIONAL_LEAD" | "MEMBER",
    status: formData.get("status") as "ACTIVE" | "INACTIVE" | "PENDING",
    teamId: (formData.get("teamId") as string) || undefined,
    userId: (formData.get("userId") as string) || undefined,
  });

  revalidatePath("/admin");
}

export async function updateProfileAction(formData: FormData) {
  const session = await requireSession();

  await updateUserProfile(session.id, {
    bio: (formData.get("bio") as string) ?? "",
    fullName: formData.get("fullName") as string,
    gender: (formData.get("gender") as string) || undefined,
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function assignRegionalLeadAction(
  userId: string,
  regionId: string,
) {
  const session = await requireSession();
  if (!session.teamId) throw new Error("Bạn chưa có nhóm.");
  await assignRegionalLead(session.teamId, userId, regionId);
  revalidatePath("/admin");
}
