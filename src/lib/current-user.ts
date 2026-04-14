import "server-only";

import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessManagement,
  canAccessRegionManagement,
  canManageTeamRegions,
} from "@/lib/permissions";
import { refreshSessionUser } from "@/lib/services/auth-service";

export async function getCurrentUser() {
  const session = await getSessionUser();

  if (!session) {
    return null;
  }

  return refreshSessionUser(session.id);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.status === "PENDING") {
    redirect("/onboarding");
  }

  return user;
}

export async function requireManagementUser() {
  const user = await requireCurrentUser();

  if (!canAccessManagement(user)) {
    redirect("/dashboard");
  }

  return user;
}

export async function requireTeamLeadUser() {
  const user = await requireCurrentUser();

  if (!canManageTeamRegions(user)) {
    redirect("/dashboard");
  }

  return user;
}

export async function requireRegionalLeadUser() {
  const user = await requireCurrentUser();

  if (!canAccessRegionManagement(user)) {
    redirect("/dashboard");
  }

  return user;
}
