import "server-only";

import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/permissions";
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

  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (!canAccessAdmin(user)) {
    redirect("/dashboard");
  }

  return user;
}
