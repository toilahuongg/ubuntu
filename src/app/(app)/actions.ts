"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import type { TemplateScope, SessionUser } from "@/lib/domain";
import { canAccessManagement } from "@/lib/permissions";
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
  getRegionById,
  getZoneById,
  saveUser,
  updateRegion,
  updateTeam,
  updateUserProfile,
  updateZone,
} from "@/lib/services/organization-service";

// A TEAM_LEAD is scoped to a single team (see permissions.ts). Any mutation
// that references a team/zone/region MUST verify ownership so one lead
// cannot create or rename structures in another lead's team by guessing IDs.
async function assertOwnsTeam(session: SessionUser, teamId: string) {
  if (!session.teamId || session.teamId !== teamId) {
    throw new Error("Bạn chỉ có quyền thao tác trên Nhóm của mình.");
  }
}

async function assertOwnsZone(session: SessionUser, zoneId: string) {
  const zone = await getZoneById(zoneId);
  if (!zone) throw new Error("Địa Vực không tồn tại.");
  await assertOwnsTeam(session, zone.teamId.toString());
}

async function assertOwnsRegion(session: SessionUser, regionId: string) {
  const region = await getRegionById(regionId);
  if (!region) throw new Error("Khu vực không tồn tại.");
  await assertOwnsTeam(session, region.teamId.toString());
}

async function requireSession() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }
  return session;
}

async function requireManagementUser(): Promise<SessionUser> {
  const session = await requireSession();
  if (!canAccessManagement(session)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
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
  await requireManagementUser();
  await approveUser(userId);
  revalidatePath("/admin");
}

export async function createTeamAction(formData: FormData) {
  await requireManagementUser();
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await createTeam(name, code);
  revalidatePath("/admin");
}

export async function updateTeamAction(formData: FormData) {
  const session = await requireManagementUser();
  const id = formData.get("id") as string;
  await assertOwnsTeam(session, id);
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await updateTeam(id, { code, name });
  revalidatePath("/admin");
}

export async function updateZoneAction(formData: FormData) {
  const session = await requireManagementUser();
  const id = formData.get("id") as string;
  await assertOwnsZone(session, id);
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await updateZone(id, { code, name });
  revalidatePath("/admin");
}

export async function updateRegionAction(formData: FormData) {
  const session = await requireManagementUser();
  const id = formData.get("id") as string;
  await assertOwnsRegion(session, id);
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await updateRegion(id, { code, name });
  revalidatePath("/admin");
}

export async function createZoneAction(formData: FormData) {
  const session = await requireManagementUser();
  const teamId = formData.get("teamId") as string;
  await assertOwnsTeam(session, teamId);
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await createZone({ code, name, teamId });
  revalidatePath("/admin");
}

export async function createRegionAction(formData: FormData) {
  const session = await requireManagementUser();
  const zoneId = formData.get("zoneId") as string;
  await assertOwnsZone(session, zoneId);
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  await createRegion({ code, name, zoneId });
  revalidatePath("/admin");
}

export async function saveUserAction(formData: FormData) {
  const session = await requireManagementUser();

  // Restrict writes to the actor's own team. Zone/region resolution inside
  // saveUser() will cross-check the hierarchy, but we block the request
  // before any DB write so an attacker can't probe foreign IDs.
  const targetTeamId = (formData.get("teamId") as string) || "";
  const targetZoneId = (formData.get("zoneId") as string) || "";
  const targetRegionId = (formData.get("regionId") as string) || "";
  if (targetTeamId) await assertOwnsTeam(session, targetTeamId);
  if (targetZoneId) await assertOwnsZone(session, targetZoneId);
  if (targetRegionId) await assertOwnsRegion(session, targetRegionId);

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
