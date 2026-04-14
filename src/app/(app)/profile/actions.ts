"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { updateUserProfile } from "@/lib/services/organization-service";
import { updateProfileInputSchema } from "@/lib/validation";

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
    await updateUserProfile(session.id, {
      fullName: parsed.fullName,
      gender: parsed.gender,
      bio: parsed.bio,
    });
    revalidatePath("/profile");
    revalidatePath("/dashboard");
  });
}
