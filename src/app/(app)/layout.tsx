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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Bỏ qua đến nội dung chính
      </a>
      <AppHeader user={session} />
      <main
        id="main-content"
        className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8"
      >
        {children}
      </main>
      <BottomNav role={session.role} />
    </div>
  );
}
