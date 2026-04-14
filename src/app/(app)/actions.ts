"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import type { TemplateScope } from "@/lib/domain";
import {
  createTaskTemplate,
  saveSubmission,
  toggleTaskTemplate,
} from "@/lib/services/task-service";
import {
  approveUser,
  createRegion,
  createTeam,
  createZone,
  saveUser,
  updateRegion,
  updateTeam,
  updateUserProfile,
  updateZone,
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
  revalidatePath("/region");
  revalidatePath("/zone");
}

// ── Task Templates ──

export async function createTemplateAction(formData: FormData) {
  const session = await requireSession();

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const deadlineTime = formData.get("deadlineTime") as string;
  const expReward = Number(formData.get("expReward")) || 10;
  const isActive = formData.get("isActive") === "true";
  const scope = ((formData.get("scope") as string) || "").toUpperCase() as TemplateScope;

  await createTaskTemplate(session, {
    deadlineTime,
    description,
    expReward,
    isActive,
    scope: scope || undefined,
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

export async function updateTeamAction(formData: FormData) {
  await requireSession();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await updateTeam(id, { code, name });
  revalidatePath("/admin");
}

export async function updateZoneAction(formData: FormData) {
  await requireSession();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await updateZone(id, { code, name });
  revalidatePath("/admin");
}

export async function updateRegionAction(formData: FormData) {
  await requireSession();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await updateRegion(id, { code, name });
  revalidatePath("/admin");
}

export async function createZoneAction(formData: FormData) {
  await requireSession();
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const teamId = formData.get("teamId") as string;
  await createZone({ code, name, teamId });
  revalidatePath("/admin");
}

export async function createRegionAction(formData: FormData) {
  await requireSession();
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const zoneId = formData.get("zoneId") as string;
  await createRegion({ code, name, zoneId });
  revalidatePath("/admin");
}

export async function saveUserAction(formData: FormData) {
  await requireSession();

  await saveUser({
    fullName: formData.get("fullName") as string,
    gender: (formData.get("gender") as string) || undefined,
    regionId: (formData.get("regionId") as string) || undefined,
    role: formData.get("role") as "TEAM_LEAD" | "ZONE_LEAD" | "REGIONAL_LEAD" | "MEMBER",
    status: formData.get("status") as "ACTIVE" | "INACTIVE" | "PENDING",
    teamId: (formData.get("teamId") as string) || undefined,
    userId: (formData.get("userId") as string) || undefined,
    zoneId: (formData.get("zoneId") as string) || undefined,
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
