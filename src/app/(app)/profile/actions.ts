"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser, setSessionCookie } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import {
  changeUserPassword,
  updateUserProfile,
} from "@/lib/services/organization-service";
import { changePasswordInputSchema, updateProfileInputSchema } from "@/lib/validation";

export async function updateProfileAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await getSessionUser();
    if (!session) redirect("/login");
    const parsed = updateProfileInputSchema.parse({
      fullName: formData.get("fullName") ?? "",
      gender: (formData.get("gender") as string) || undefined,
      bio: (formData.get("bio") as string) ?? "",
    });
    const updatedUser = await updateUserProfile(session.id, {
      fullName: parsed.fullName,
      gender: parsed.gender,
      bio: parsed.bio,
    });
    await setSessionCookie(updatedUser);
    revalidatePath("/profile");
    revalidatePath("/dashboard");
  });
}

export async function changePasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await getSessionUser();
    if (!session) redirect("/login");
    const parsed = changePasswordInputSchema.parse({
      currentPassword: formData.get("currentPassword") ?? "",
      newPassword: formData.get("newPassword") ?? "",
      confirmPassword: formData.get("confirmPassword") ?? "",
    });
    await changeUserPassword(
      session.id,
      parsed.currentPassword,
      parsed.newPassword,
    );
    revalidatePath("/profile");
  });
}
