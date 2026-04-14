import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { listRegions, listTeams } from "@/lib/services/organization-service";
import { RegionForm } from "./region-form";

export default async function SelectRegionPage() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  if (session.status !== "PENDING") {
    redirect("/dashboard");
  }

  const [teams, regions] = await Promise.all([listTeams(), listRegions()]);

  const teamMap = new Map(teams.map((t) => [t._id.toString(), t.name]));

  const grouped = teams.map((team) => ({
    teamId: team._id.toString(),
    teamName: team.name,
    regions: regions
      .filter((r) => r.teamId.toString() === team._id.toString())
      .map((r) => ({
        id: r._id.toString(),
        name: r.name,
        code: r.code,
      })),
  }));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <MapPin className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-xl font-bold tracking-tight">
              Chọn Khu Vực
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Xin chào <strong>{session.fullName}</strong>! Chọn khu vực bạn
              thuộc về.
            </p>
          </div>
        </div>

        <RegionForm groups={grouped} />
      </div>
    </main>
  );
}
