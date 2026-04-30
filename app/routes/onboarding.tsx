import { Link, redirect } from "react-router";
import { Clock } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { refreshSessionUser } from "@/lib/services/auth-service";
import { LogoutButton } from "app/onboarding/logout-button";

export async function ServerComponent() {
  const session = await getSessionUser();

  if (!session) {
    throw redirect("/login");
  }

  const user = await refreshSessionUser(session.id);

  if (!user) {
    throw redirect("/login");
  }

  if (user.status !== "PENDING") {
    throw redirect("/api/session/refresh?redirect=/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-overlay-subtle blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-overlay-subtle blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-overlay-medium backdrop-blur-sm">
            <Clock className="h-7 w-7 text-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-xl font-bold tracking-tight">
              Đang chờ xét duyệt
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Xin chào <strong>{user.fullName}</strong>! Tài khoản của bạn đã
              được tạo và đang chờ quản trị viên xét duyệt. Vui lòng quay lại
              sau.
            </p>
          </div>
        </div>

        <div className="glass-card space-y-3 p-5">
          <p className="text-center text-sm text-muted-foreground">
            Bạn sẽ có thể truy cập ứng dụng ngay khi được phê duyệt.
          </p>
          <Link
            to="/api/session/refresh?redirect=/dashboard"
            className="btn-gradient flex h-10 w-full items-center justify-center text-sm"
          >
            Kiểm tra lại trạng thái
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            Nếu vừa được duyệt, bấm nút trên để vào ứng dụng ngay.
          </p>
        </div>

        <div className="mt-4 flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
