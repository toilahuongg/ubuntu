import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  if (session.status === "PENDING") {
    redirect("/onboarding");
  }

  if (session.status === "INACTIVE") {
    redirect("/login?error=Tài+khoản+đã+bị+khóa");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session} />
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <BottomNav role={session.role} />
    </div>
  );
}
