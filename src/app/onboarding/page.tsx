import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { refreshSessionUser } from "@/lib/services/auth-service";
import { listTeams, listZones } from "@/lib/services/organization-service";
import { LogoutButton } from "./logout-button";
import { PendingScopeForm } from "./scope-form";

export default async function OnboardingPendingPage() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  const user = await refreshSessionUser(session.id);

  if (!user) {
    redirect("/login");
  }

  if (user.status !== "PENDING") {
    redirect("/api/session/refresh?next=/dashboard");
  }

  const needsScope = !user.teamId || !user.zoneId;
  const [teams, zones] = needsScope
    ? await Promise.all([listTeams(), listZones()])
    : [[], []];
  const teamOptions = teams.map((team) => ({
    id: team._id.toString(),
    name: team.name,
  }));
  const zoneOptions = zones.map((zone) => ({
    id: zone._id.toString(),
    name: zone.name,
    teamId: zone.teamId.toString(),
  }));

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
          {needsScope ? (
            <p className="text-center text-sm text-muted-foreground">
              Vui lòng chọn Nhóm và Địa Vực để gửi yêu cầu duyệt.
            </p>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Bạn sẽ có thể truy cập ứng dụng ngay khi được phê duyệt.
              </p>
              <Link
                href="/api/session/refresh?next=/dashboard"
                className="btn-gradient flex h-10 w-full items-center justify-center text-sm"
              >
                Kiểm tra lại trạng thái
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                Nếu vừa được duyệt, bấm nút trên để vào ứng dụng ngay.
              </p>
            </>
          )}
        </div>

        {needsScope && (
          <div className="mt-3">
            <PendingScopeForm teams={teamOptions} zones={zoneOptions} />
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
