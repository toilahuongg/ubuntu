"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import type { Role, SessionUser } from "@/lib/domain";
import { canAccessManagement, isAdmin } from "@/lib/permissions";
import {
  approveUser,
  bulkApproveUsers,
  createRegion,
  createTeam,
  createZone,
  deleteRegion,
  deleteTeam,
  deleteUser,
  deleteZone,
  getRegionById,
  getZoneById,
  saveUser,
  updateRegion,
  updateTeam,
  updateZone,
} from "@/lib/services/organization-service";

export type { ActionResult } from "@/lib/actions/result";

async function assertOwnsTeam(session: SessionUser, teamId: string) {
  if (isAdmin(session)) return;
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

// ── Organization ──

export async function approveUserAction(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireManagementUser();
    await approveUser(userId);
    revalidatePath("/admin");
  });
}

export async function bulkApproveUsersAction(
  userIds: string[],
): Promise<ActionResult<{ approved: number }>> {
  return runAction(async () => {
    await requireManagementUser();
    const approved = await bulkApproveUsers(userIds);
    revalidatePath("/admin");
    return { approved };
  });
}

export async function createTeamAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    if (!isAdmin(session)) {
      throw new Error("Chỉ ADMIN mới được tạo Nhóm mới.");
    }
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await createTeam(name, code);
    revalidatePath("/admin");
  });
}

export async function updateTeamAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    const id = formData.get("id") as string;
    await assertOwnsTeam(session, id);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await updateTeam(id, { code, name });
    revalidatePath("/admin");
  });
}

export async function deleteTeamAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    await assertOwnsTeam(session, id);
    await deleteTeam(id);
    revalidatePath("/admin");
  });
}

export async function updateZoneAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    const id = formData.get("id") as string;
    await assertOwnsZone(session, id);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await updateZone(id, { code, name });
    revalidatePath("/admin");
  });
}

export async function deleteZoneAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    await assertOwnsZone(session, id);
    await deleteZone(id);
    revalidatePath("/admin");
  });
}

export async function updateRegionAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    const id = formData.get("id") as string;
    await assertOwnsRegion(session, id);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await updateRegion(id, { code, name });
    revalidatePath("/admin");
  });
}

export async function deleteRegionAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    await assertOwnsRegion(session, id);
    await deleteRegion(id);
    revalidatePath("/admin");
  });
}

export async function createZoneAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    const teamId = formData.get("teamId") as string;
    await assertOwnsTeam(session, teamId);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await createZone({ code, name, teamId });
    revalidatePath("/admin");
  });
}

export async function createRegionAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    const zoneId = formData.get("zoneId") as string;
    await assertOwnsZone(session, zoneId);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await createRegion({ code, name, zoneId });
    revalidatePath("/admin");
  });
}

export async function saveUserAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();

    // Restrict writes to the actor's own team. Zone/region resolution inside
    // saveUser() will cross-check the hierarchy, but we block the request
    // before any DB write so an attacker can't probe foreign IDs.
    const userId = (formData.get("userId") as string) || undefined;
    const role = formData.get("role") as Role;

    let targetTeamId = (formData.get("teamId") as string) || "";
    const targetZoneId = (formData.get("zoneId") as string) || "";
    const targetRegionId = (formData.get("regionId") as string) || "";

    if (role === "ADMIN" && userId === session.id && !targetTeamId && session.teamId) {
      targetTeamId = session.teamId;
    }

    if (targetTeamId) await assertOwnsTeam(session, targetTeamId);
    if (targetZoneId) await assertOwnsZone(session, targetZoneId);
    if (targetRegionId) await assertOwnsRegion(session, targetRegionId);

    await saveUser({
      fullName: formData.get("fullName") as string,
      gender: (formData.get("gender") as string) || undefined,
      regionId: (formData.get("regionId") as string) || undefined,
      role,
      status: formData.get("status") as "ACTIVE" | "INACTIVE" | "PENDING",
      teamId: targetTeamId || undefined,
      userId,
      zoneId: targetZoneId || undefined,
    });

    revalidatePath("/admin");
  });
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireManagementUser();
    if (session.id === userId) {
      throw new Error("Không thể xóa chính bạn.");
    }
    await deleteUser(userId);
    revalidatePath("/admin");
  });
}
