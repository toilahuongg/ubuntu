import { redirect } from "react-router";
import { getSessionUser } from "@/lib/auth/session";

export async function ServerComponent() {
  const session = await getSessionUser();

  if (!session) {
    throw redirect("/login");
  }

  if (session.status === "PENDING") {
    throw redirect("/onboarding");
  }

  throw redirect("/dashboard");
}
