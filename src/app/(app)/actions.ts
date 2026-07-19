"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import type { Role, SessionUser } from "@/lib/domain";
import {
  canAccessManagement,
  canAccessUserManagement,
  canAssignUserRole,
  canCreateRegionStructure,
  canCreateTeamStructure,
  canCreateZoneStructure,
  canAccessRegionStructure,
  canAccessTeamStructure,
  canAccessZoneStructure,
  canManageUser,
  isAdmin,
} from "@/lib/permissions";
import {
  approveUser,
  bulkApproveUsers,
  completePendingUserScope,
  createRegion,
  createTeam,
  createZone,
  deleteRegion,
  deleteTeam,
  deleteUser,
  deleteZone,
  getUserById,
  getRegionById,
  getZoneById,
  resetManagedUserPassword,
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

async function requireTeamStructureUser(): Promise<SessionUser> {
  const session = await requireSession();
  if (!canAccessTeamStructure(session)) {
    throw new Error("Bạn không có quyền quản lý Nhóm.");
  }
  return session;
}

async function requireZoneStructureUser(): Promise<SessionUser> {
  const session = await requireSession();
  if (!canAccessZoneStructure(session)) {
    throw new Error("Bạn không có quyền quản lý Địa Vực.");
  }
  return session;
}

async function requireRegionStructureUser(): Promise<SessionUser> {
  const session = await requireSession();
  if (!canAccessRegionStructure(session)) {
    throw new Error("Bạn không có quyền quản lý Khu vực.");
  }
  return session;
}

async function requireUserManagementUser(): Promise<SessionUser> {
  const session = await requireSession();
  if (!canAccessUserManagement(session)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  return session;
}

async function assertCanManageTeamStructure(
  session: SessionUser,
  teamId: string,
) {
  if (isAdmin(session)) return;
  if (session.role === "TEAM_LEAD" && session.teamId === teamId) return;
  throw new Error("Bạn chỉ có quyền thao tác trên Nhóm của mình.");
}

async function assertCanManageZoneStructure(
  session: SessionUser,
  zoneId: string,
) {
  const zone = await getZoneById(zoneId);
  if (!zone) throw new Error("Địa Vực không tồn tại.");

  if (isAdmin(session)) return;
  if (session.role === "TEAM_LEAD" && session.teamId === zone.teamId.toString()) {
    return;
  }
  if (session.role === "ZONE_LEAD" && session.zoneId === zone._id.toString()) {
    return;
  }

  throw new Error("Bạn không có quyền thao tác trên Địa Vực này.");
}

async function assertCanManageRegionStructure(
  session: SessionUser,
  regionId: string,
) {
  const region = await getRegionById(regionId);
  if (!region) throw new Error("Khu vực không tồn tại.");

  if (isAdmin(session)) return;
  if (session.role === "TEAM_LEAD" && session.teamId === region.teamId.toString()) {
    return;
  }
  if (session.role === "ZONE_LEAD" && session.zoneId === region.zoneId.toString()) {
    return;
  }
  if (session.role === "REGIONAL_LEAD" && session.regionId === region._id.toString()) {
    return;
  }

  throw new Error("Bạn không có quyền thao tác trên Khu vực này.");
}

async function assertCanAssignUserTarget(
  session: SessionUser,
  input: {
    regionId?: string;
    role: Role;
    teamId?: string;
    zoneId?: string;
  },
) {
  if (!canAssignUserRole(session, input.role)) {
    throw new Error("Bạn không có quyền gán vai trò này.");
  }

  if (isAdmin(session)) return;

  if (input.role === "TEAM_LEAD") {
    if (!input.teamId) throw new Error("Vui lòng chọn Nhóm cho CS - ĐL.");
    await assertOwnsTeam(session, input.teamId);
    return;
  }

  if (input.role === "ZONE_LEAD") {
    if (!input.zoneId) throw new Error("Vui lòng chọn Địa Vực cho ĐVT - NQL.");
    const zone = await getZoneById(input.zoneId);
    if (!zone) throw new Error("Địa Vực không tồn tại.");
    await assertOwnsTeam(session, zone.teamId.toString());
    return;
  }

  if (!input.regionId) {
    throw new Error("Vui lòng chọn Khu vực cho TĐ/TĐM/NTĐ/KVT.");
  }

  const region = await getRegionById(input.regionId);
  if (!region) throw new Error("Khu vực không tồn tại.");

  if (session.role === "TEAM_LEAD") {
    await assertOwnsTeam(session, region.teamId.toString());
    return;
  }

  if (session.role === "ZONE_LEAD") {
    if (!session.zoneId || session.zoneId !== region.zoneId.toString()) {
      throw new Error("Bạn chỉ có quyền thao tác trong Địa Vực của mình.");
    }
    return;
  }

  if (session.role === "REGIONAL_LEAD") {
    if (!session.regionId || session.regionId !== region._id.toString()) {
      throw new Error("Bạn chỉ có quyền thao tác trong Khu vực của mình.");
    }
    return;
  }

  throw new Error("Bạn không có quyền thực hiện thao tác này.");
}

// ── Organization ──

export async function approveUserAction(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    void userId;
    throw new Error("Vui lòng chọn Khu vực trước khi duyệt.");
  });
}

export async function approveUserWithRegionAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    const userId = formData.get("userId") as string;
    const regionId = formData.get("regionId") as string;
    await approveUser(session, { regionId, userId });
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

export async function completePendingUserScopeAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    if (session.status !== "PENDING") {
      throw new Error("Tài khoản này không ở trạng thái chờ duyệt.");
    }
    await completePendingUserScope(session.id, {
      teamId: formData.get("teamId") as string,
      zoneId: formData.get("zoneId") as string,
    });
    revalidatePath("/onboarding");
  });
}

export async function createTeamAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    if (!canCreateTeamStructure(session)) {
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
    const session = await requireTeamStructureUser();
    const id = formData.get("id") as string;
    await assertCanManageTeamStructure(session, id);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await updateTeam(id, { code, name });
    revalidatePath("/admin");
  });
}

export async function deleteTeamAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireTeamStructureUser();
    await assertCanManageTeamStructure(session, id);
    await deleteTeam(id);
    revalidatePath("/admin");
  });
}

export async function updateZoneAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireZoneStructureUser();
    const id = formData.get("id") as string;
    await assertCanManageZoneStructure(session, id);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await updateZone(id, { code, name });
    revalidatePath("/admin");
  });
}

export async function deleteZoneAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireZoneStructureUser();
    await assertCanManageZoneStructure(session, id);
    await deleteZone(id);
    revalidatePath("/admin");
  });
}

export async function updateRegionAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRegionStructureUser();
    const id = formData.get("id") as string;
    await assertCanManageRegionStructure(session, id);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await updateRegion(id, { code, name });
    revalidatePath("/admin");
  });
}

export async function deleteRegionAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRegionStructureUser();
    await assertCanManageRegionStructure(session, id);
    await deleteRegion(id);
    revalidatePath("/admin");
  });
}

export async function createZoneAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    if (!canCreateZoneStructure(session)) {
      throw new Error("Bạn không có quyền tạo Địa Vực.");
    }
    const teamId = formData.get("teamId") as string;
    await assertCanManageTeamStructure(session, teamId);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await createZone({ code, name, teamId });
    revalidatePath("/admin");
  });
}

export async function createRegionAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    if (!canCreateRegionStructure(session)) {
      throw new Error("Bạn không có quyền tạo Khu vực.");
    }
    const zoneId = formData.get("zoneId") as string;
    await assertCanManageZoneStructure(session, zoneId);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    await createRegion({ code, name, zoneId });
    revalidatePath("/admin");
  });
}

export async function saveUserAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireUserManagementUser();

    // Restrict writes before saveUser() resolves hierarchy so direct Server
    // Action calls cannot probe or assign users outside the actor's scope.
    const userId = (formData.get("userId") as string) || undefined;
    const role = formData.get("role") as Role;

    let targetTeamId = (formData.get("teamId") as string) || "";
    const targetZoneId = (formData.get("zoneId") as string) || "";
    const targetRegionId = (formData.get("regionId") as string) || "";

    if (userId) {
      const existingUser = await getUserById(userId);
      if (!existingUser) {
        throw new Error("Không tìm thấy người dùng.");
      }
      if (!canManageUser(session, existingUser)) {
        throw new Error("Bạn không có quyền sửa người dùng này.");
      }
    }

    if (role === "ADMIN" && userId === session.id && !targetTeamId && session.teamId) {
      targetTeamId = session.teamId;
    }

    await assertCanAssignUserTarget(session, {
      regionId: targetRegionId || undefined,
      role,
      teamId: targetTeamId || undefined,
      zoneId: targetZoneId || undefined,
    });

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
    const session = await requireUserManagementUser();
    if (session.id === userId) {
      throw new Error("Không thể xóa chính bạn.");
    }
    const user = await getUserById(userId);
    if (!user) {
      throw new Error("Không tìm thấy người dùng.");
    }
    if (!canManageUser(session, user)) {
      throw new Error("Bạn không có quyền xóa người dùng này.");
    }
    await deleteUser(userId);
    revalidatePath("/admin");
  });
}

export async function resetManagedUserPasswordAction(
  userId: string,
): Promise<ActionResult<{ temporaryPassword: string }>> {
  return runAction(async () => {
    const session = await requireUserManagementUser();
    const result = await resetManagedUserPassword(session, userId);
    revalidatePath("/admin/users");
    return result;
  });
}
